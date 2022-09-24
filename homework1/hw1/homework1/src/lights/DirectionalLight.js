//定义了一个DirectionalLight类
class DirectionalLight {

    //包含了一个构造函数（创建和初始化有类创建的对象）
    constructor(lightIntensity, lightColor, lightPos, focalPoint, lightUp, hasShadowMap, gl) {
        this.mesh = Mesh.cube(setTransform(0, 0, 0, 0.2, 0.2, 0.2, 0));
        this.mat = new EmissiveMaterial(lightIntensity, lightColor);
        this.lightPos = lightPos; //光源
        this.focalPoint = focalPoint; //焦点
        this.lightUp = lightUp

        this.hasShadowMap = hasShadowMap;
        this.fbo = new FBO(gl); //class FBO里创建的framebuffer
        if (!this.fbo) {
            console.log("无法设置帧缓冲区对象");
            return;
        }
    }

    //一个CalcLightMVP的方法，该方法返回值为一个MVP矩阵，是实现2pass shadow map 的第一步“Render from light”

    CalcLightMVP(translate, scale) {
        //传入两个矩阵帮我们构建光源矩阵
        let lightMVP = mat4.create();
        let modelMatrix = mat4.create();
        let viewMatrix = mat4.create();
        let projectionMatrix = mat4.create();

        // Model transform

        // translate里
        // 传入a-变换完后存储的地方
        // 传入b-原矩阵
        // 传入c-变换
        // 这里表示Modelmatrix进行translate变换， Scale同理
        mat4.translate(modelMatrix,modelMatrix,translate);
        mat4.scale(modelMatrix,modelMatrix,scale);

        // View transform

        // lookAt函数
        // a-存储结果
        // b-light position
        // c-focal point
        // d-light up
        mat4.lookAt(viewMatrix,this.lightPos,this.focalPoint,this.lightUp);
    
        // Projection transform

        // ortho函数 mat4.ortho(a,l,r,b,t,n,f);
        // a-存储结果
        // l,r 控制矩阵左右
        // b,t 控制矩阵上下
        // n,f 控制远近
        mat4.ortho(projectionMatrix,-150,150,-150,150,1e-2,400);


        mat4.multiply(lightMVP, projectionMatrix, viewMatrix);
        mat4.multiply(lightMVP, lightMVP, modelMatrix);

        return lightMVP;
    }
}
