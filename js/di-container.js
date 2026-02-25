// 依赖注入容器
// 使用服务定位器模式+依赖注入,实现模块间解耦

/**
 * 依赖注入容器
 * 负责管理所有服务实例和依赖关系
 */
class DIContainer {
    constructor() {
        // 服务注册表
        this.services = new Map();
        // 单例缓存
        this.singletons = new Map();
        // 工厂函数注册表
        this.factories = new Map();
    }

    /**
     * 注册单例服务
     * @param {string} name - 服务名称
     * @param {*} implementation - 服务实现(构造函数或实例)
     */
    registerSingleton(name, implementation) {
        if (typeof implementation === 'function') {
            // 构造函数,延迟实例化
            this.factories.set(name, implementation);
        } else {
            // 直接实例,立即缓存
            this.singletons.set(name, implementation);
            this.services.set(name, implementation);
        }
    }

    /**
     * 注册 transient 服务(每次获取都创建新实例)
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数
     */
    registerTransient(name, factory) {
        this.factories.set(name, factory);
    }

    /**
     * 注册工厂函数
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数
     */
    registerFactory(name, factory) {
        this.factories.set(name, factory);
    }

    /**
     * 解析服务
     * @param {string} name - 服务名称
     * @returns {*} 服务实例
     */
    resolve(name) {
        // 检查单例缓存
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // 检查服务注册
        if (!this.services.has(name) && !this.factories.has(name)) {
            throw new Error(`服务 ${name} 未注册`);
        }

        // 检查工厂函数
        if (this.factories.has(name)) {
            const factory = this.factories.get(name);
            const instance = this.createInstance(factory);

            // 如果是单例工厂,缓存实例
            if (this.services.has(name)) {
                this.singletons.set(name, instance);
            }

            return instance;
        }

        return this.services.get(name);
    }

    /**
     * 创建实例(支持依赖注入)
     * @param {Function} Constructor - 构造函数
     * @returns {*} 实例
     */
    createInstance(Constructor) {
        // 检查构造函数的依赖注解
        const dependencies = this.extractDependencies(Constructor) || [];

        // 解析依赖
        const instances = dependencies.map(dep => this.resolve(dep));

        // 创建实例
        return new Constructor(...instances);
    }

    /**
     * 提取依赖注解
     * @param {Function} Constructor - 构造函数
     * @returns {string[]} 依赖名称数组
     */
    extractDependencies(Constructor) {
        // 从构造函数的 $inject 属性获取依赖
        if (Constructor.$inject) {
            return Constructor.$inject;
        }

        // 从参数名推断依赖(需要源码保留参数名)
        if (Constructor.length > 0) {
            const paramNames = this.getParamNames(Constructor);
            return paramNames;
        }

        return [];
    }

    /**
     * 获取函数参数名
     * @param {Function} func - 函数
     * @returns {string[]} 参数名数组
     */
    getParamNames(func) {
        const funcStr = func.toString();
        const match = funcStr.match(/^function\s*\((.*?)\)/);
        if (match && match[1]) {
            return match[1].split(',').map(s => s.trim()).filter(s => s);
        }
        return [];
    }

    /**
     * 检查服务是否已注册
     * @param {string} name - 服务名称
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name) || this.factories.has(name) || this.singletons.has(name);
    }

    /**
     * 清空所有注册(主要用于测试)
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
    }

    /**
     * 获取所有已注册的服务名称
     * @returns {string[]}
     */
    getRegisteredServices() {
        const names = new Set([
            ...this.services.keys(),
            ...this.factories.keys(),
            ...this.singletons.keys()
        ]);
        return Array.from(names);
    }
}

/**
 * 创建全局容器实例
 */
const container = new DIContainer();

/**
 * 服务定位器
 * 提供便捷的服务访问接口
 */
const ServiceLocator = {
    /**
     * 获取服务
     * @param {string} name - 服务名称
     * @returns {*}
     */
    get(name) {
        return container.resolve(name);
    },

    /**
     * 检查服务是否存在
     * @param {string} name - 服务名称
     * @returns {boolean}
     */
    has(name) {
        return container.has(name);
    },

    /**
     * 注册服务
     * @param {string} name - 服务名称
     * @param {*} implementation - 服务实现
     * @param {boolean} singleton - 是否单例(默认true)
     */
    register(name, implementation, singleton = true) {
        if (singleton) {
            container.registerSingleton(name, implementation);
        } else {
            container.registerTransient(name, implementation);
        }
    },

    /**
     * 注册工厂函数
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数
     */
    registerFactory(name, factory) {
        container.registerFactory(name, factory);
    }
};

/**
 * 装饰器:标记类为可注入服务
 * @param {string} serviceName - 服务名称
 * @param {boolean} singleton - 是否单例
 */
function Injectable(serviceName, singleton = true) {
    return function(target) {
        // 将构造函数注册到容器
        ServiceLocator.register(serviceName, target, singleton);
    };
}

/**
 * 装饰器:标记依赖
 * @param {...string} dependencies - 依赖名称
 */
function Inject(...dependencies) {
    return function(target) {
        target.$inject = dependencies;
    };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DIContainer,
        ServiceLocator,
        Injectable,
        Inject
    };
}
