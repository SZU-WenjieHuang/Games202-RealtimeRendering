//定义一个基础材质
class Material { //声明一个Class 定义Material类
    // #表示私有字段，类似cpp里面的Private
    #flatten_uniforms;
    #flatten_attribs;
    #vsSrc;
    #fsSrc;
    // Uniforms is a map（字典）, attribs is a Array（数组）
    // 构造函数 constructor()--创建和初始化在类中创建的对象
    constructor(uniforms, attribs, vsSrc, fsSrc, frameBuffer) {
        // 构造函数内有四个参数，用于设置以下字段 this.xx的初始值
        // this.xx表示创建一个实例字段名，其中两个公共两个私有
        this.uniforms = uniforms;
        this.attribs = attribs;
        this.#vsSrc = vsSrc;
        this.#fsSrc = fsSrc;
        
        // 材质定义一个#flatten_unifoms以保留uniforms字段
        this.#flatten_uniforms = ['uViewMatrix','uModelMatrix', 'uProjectionMatrix', 'uCameraPos', 'uLightPos'];
        // 用for循环遍历数组，给#flatten_uniforms添加uniform的字段
        for (let k in uniforms) {
            this.#flatten_uniforms.push(k);
        }
        this.#flatten_attribs = attribs;

        this.frameBuffer = frameBuffer;
    }
    
    // 创建一个方法，用以储存mesh的额外属性
    setMeshAttribs(extraAttribs) {
        for (let i = 0; i < extraAttribs.length; i++) {
            this.#flatten_attribs.push(extraAttribs[i]);
        }
    }
    // 创建一个Shader，以实现调用Shader类以编译shader
    compile(gl) {
        return new Shader(gl, this.#vsSrc, this.#fsSrc,
            {
                uniforms: this.#flatten_uniforms,
                attribs: this.#flatten_attribs
            });
    }
}