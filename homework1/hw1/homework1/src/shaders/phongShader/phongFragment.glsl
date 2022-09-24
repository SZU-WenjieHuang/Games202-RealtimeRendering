#ifdef GL_ES
precision mediump float;
#endif

// Phong related variables
uniform sampler2D uSampler;
uniform vec3 uKd;
uniform vec3 uKs;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uLightIntensity;

varying highp vec2 vTextureCoord;
varying highp vec3 vFragPos;
varying highp vec3 vNormal;

// Shadow map related variables
#define NUM_SAMPLES 60
#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES
#define PCF_NUM_SAMPLES NUM_SAMPLES
#define NUM_RINGS 1

#define EPS 1e-3
#define PI 3.141592653589793
#define PI2 6.283185307179586
#define W_LIGHT 1.0

uniform sampler2D uShadowMap;

varying vec4 vPositionFromLight;

highp float rand_1to1(highp float x ) { 
  // -1 -1
  return fract(sin(x)*10000.0);
}

highp float rand_2to1(vec2 uv ) { 
  // 0 - 1
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}

float unpack(vec4 rgbaDepth) {
    const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
    return dot(rgbaDepth, bitShift);
}

vec2 poissonDisk[NUM_SAMPLES];

void poissonDiskSamples( const in vec2 randomSeed ) {

  float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
  float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );

  float angle = rand_2to1( randomSeed ) * PI2;
  float radius = INV_NUM_SAMPLES;
  float radiusStep = radius;

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( cos( angle ), sin( angle ) ) * pow( radius, 0.75 );
    radius += radiusStep;
    angle += ANGLE_STEP;
  }
}

void uniformDiskSamples( const in vec2 randomSeed ) {

  float randNum = rand_2to1(randomSeed);
  float sampleX = rand_1to1( randNum ) ;
  float sampleY = rand_1to1( sampleX ) ;

  float angle = sampleX * PI2;
  float radius = sqrt(sampleY);

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    poissonDisk[i] = vec2( radius * cos(angle) , radius * sin(angle)  );

    sampleX = rand_1to1( sampleY ) ;
    sampleY = rand_1to1( sampleX ) ;

    angle = sampleX * PI2;
    radius = sqrt(sampleY);
  }
}

float findBlocker( sampler2D shadowMap,  vec2 uv, float zReceiver ) {
  // 传入 shadowMap / uv / zReceiver

  // 泊松采样 uv
  poissonDiskSamples(uv);

  // texture size大小
  float textureSize = 2048.0;

  float filterStride = 30.0;
  float filterRange = 1.0 / textureSize * filterStride;

  // 计算在阴影里的点
  int shadowCount = 0; //注意区别，PCF统计的是不在阴影里的数量，这里是在！
  float blockDepth = 0.0;

  for( int i = 0; i < NUM_SAMPLES; i ++ ) {
    vec2 sampleCoord = poissonDisk[i] * filterRange + uv;
    vec4 closestDepthVec = texture2D(shadowMap, sampleCoord); 
    float closestDepth = unpack(closestDepthVec);

    // 要是承影面比光源深度远，说明这个采样点招不到光，inshadow
    if(zReceiver > closestDepth + 0.01){
      blockDepth += closestDepth;
      shadowCount += 1;
    }
  }

  // 要是每个点都在阴影里，那就给个大的值
  if(shadowCount == NUM_SAMPLES)
  {
    return 1.1;
  }

  //返回block遮挡的平均深度
  return blockDepth / float(shadowCount);
}

float PCF(sampler2D shadowMap, vec4 coords) {

  // 采样
  poissonDiskSamples(coords.xy);

  // step1 确定 shadow map 的大小
  float textureSize = 600.0;

  // step2 确定采样的步长
  float filterStride = 5.0;

  // step3 确定滤波窗口范围
  float filterRange = 1.0 / textureSize * filterStride;
  //这一步是把shadowmap归一到[0,1]然后乘一个步长

  // step4 遍历确认有多少点不在阴影里
  int noShadowCount = 0;
  for( int i = 0; i < NUM_SAMPLES; i++) 
  {
    vec2 sampleCoord = poissonDisk[i] * filterRange + coords.xy; //采样坐标 泊松采样(决定采样orNot)
    vec4 closestDepthVec = texture2D(shadowMap,sampleCoord);//用采样坐标在shadowMap上得到深度值(光源)
    float closestDepth = unpack(closestDepthVec); //unpack光源深度值
    float currentDepth = coords.z;//相机深度值
    if(currentDepth < closestDepth + 0.01)
    {
      noShadowCount += 1;
    }
  }

  // step5 求个比例，比例越低阴影越淡
  float shadow = float(noShadowCount) / float(NUM_SAMPLES);
  return shadow;
}

float PCSS(sampler2D shadowMap, vec4 coords){
  float zReceiver = coords.z;

  // STEP 1: avgblocker depth 能产生阴影的平均深度
  // 直接用上一步写好的 findblocker函数，就是公式里的zBlocker
  float zBlocker = findBlocker(shadowMap,coords.xy,zReceiver);
  if(zBlocker < EPS) return 1.0;
  if(zBlocker > 1.0) return 0.0;
  
  // STEP 2: penumbra size 根据相似三角形 计算PCF的采样范围 
  float wPenumbra = (zReceiver - zBlocker) * W_LIGHT / zBlocker;


  // STEP 3: filtering 执行 这一步和PCF是一样的
  float textureSize = 2048.0;
  float filterStride = 20.0;
  float filterRange = 1.0 / textureSize * filterStride * wPenumbra;
  int noShadowCount = 0;

  for( int i = 0; i < NUM_SAMPLES; i++) 
  {
    vec2 sampleCoord = poissonDisk[i] * filterRange + coords.xy; //采样坐标 泊松采样(决定采样orNot)
    vec4 closestDepthVec = texture2D(shadowMap,sampleCoord);//用采样坐标在shadowMap上得到深度值(光源)
    float closestDepth = unpack(closestDepthVec); //unpack光源深度值
    float currentDepth = coords.z;//相机深度值
    if(currentDepth < closestDepth + 0.01)
    {
      noShadowCount += 1;
    }
  }

  float shadow = float(noShadowCount) / float(NUM_SAMPLES);
  return shadow;
}


float useShadowMap(sampler2D shadowMap, vec4 shadowCoord){

  // closestDepth = 光源深度值
  // currentDepth = 相机深度值

  // 首先通过shadowCoord获取坐标并通过texture2D()采样 得到光源的深度值
  vec4 closestDepthVec = texture2D(shadowMap,shadowCoord.xy);

  // 接着通过unpack函数对depth进行decode
  float closestDepth = unpack(closestDepthVec);

  // 然后通过跟 相机的深度值比较得到阴影
  float currentDepth = shadowCoord.z;
  float shadow = closestDepth > currentDepth ? 1.0 : 0.0;
  return shadow;
}

vec3 blinnPhong() {
  vec3 color = texture2D(uSampler, vTextureCoord).rgb;
  color = pow(color, vec3(2.2));

  vec3 ambient = 0.05 * color;

  vec3 lightDir = normalize(uLightPos);
  vec3 normal = normalize(vNormal);
  float diff = max(dot(lightDir, normal), 0.0);
  vec3 light_atten_coff =
      uLightIntensity / pow(length(uLightPos - vFragPos), 2.0);
  vec3 diffuse = diff * light_atten_coff * color;

  vec3 viewDir = normalize(uCameraPos - vFragPos);
  vec3 halfDir = normalize((lightDir + viewDir));
  float spec = pow(max(dot(halfDir, normal), 0.0), 32.0);
  vec3 specular = uKs * light_atten_coff * spec;

  vec3 radiance = (ambient + diffuse + specular);
  vec3 phongColor = pow(radiance, vec3(1.0 / 2.2));
  return phongColor;
}

void main(void) {

  // 透视除法
  vec3 shadowCoord = vPositionFromLight.xyz / vPositionFromLight.w;
  // 从[-1,1] 归一化至[0,1]
  shadowCoord = shadowCoord *0.5 + 0.5;

  float visibility;
  //visibility = useShadowMap(uShadowMap, vec4(shadowCoord, 1.0));
  //visibility = PCF(uShadowMap, vec4(shadowCoord, 1.0));
  visibility = PCSS(uShadowMap, vec4(shadowCoord, 1.0));

  vec3 phongColor = blinnPhong();

  gl_FragColor = vec4(phongColor * visibility, 1.0);
  //gl_FragColor = vec4(phongColor, 1.0);
}