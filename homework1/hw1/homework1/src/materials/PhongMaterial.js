// 这个 Class通过 extends 关键字以继承 Material类；
// Material父类，PhongMaterial子类；
class PhongMaterial extends Material {

    //构造函数传入了以下参数：
    // vec3f color->材质颜色
    // Texture colorMap->即材质的texture object-材质的纹理贴图
    // vec3f specular->材质的高光项
    // 类 light ->光源
    // translate&scale -> 根据engine.js定义的setTransform()分别赋值

    constructor(color, specular, light, translate, scale, vertexShader, fragmentShader) {
        let lightMVP = light.CalcLightMVP(translate, scale);
        let lightIntensity = light.mat.GetIntensity();

        super({
            // Phong
            'uSampler': { type: 'texture', value: color },
            'uKs': { type: '3fv', value: specular },
            'uLightIntensity': { type: '3fv', value: lightIntensity },
            // Shadow
            'uShadowMap': { type: 'texture', value: light.fbo },
            'uLightMVP': { type: 'matrix4fv', value: lightMVP },

        }, [], vertexShader, fragmentShader);
    }
}

async function buildPhongMaterial(color, specular, light, translate, scale, vertexPath, fragmentPath) {


    let vertexShader = await getShaderString(vertexPath);
    let fragmentShader = await getShaderString(fragmentPath);

    return new PhongMaterial(color, specular, light, translate, scale, vertexShader, fragmentShader);

}