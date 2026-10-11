/**
 * extract-form-fields.js
 *
 * 从真实业务前端的 Vue Form 组件提取表单字段，生成 page-fields-config.js。
 *
 * 输入：
 *   - pages/admin 目录下的所有 HTML 文件（提取 title 与 <th> 表头）
 *   - 真实 Vue 工程的 views 目录下的所有 *Form.vue 文件（字段与控件类型的权威来源）
 *
 * 输出：
 *   - js/page-fields-config.js
 *
 * 重要：真实 Vue 工程（默认为 yudao-ui-admin-vue3）不入库且常被 .gitignore 忽略。
 * 一旦它缺失，脚本会退化为「仅由表头推断字段」，产出的配置质量显著下降且**不会报错**，
 * 这正是历史上配置失真的根因。因此这里改为：默认直接报错退出，
 * 只有显式传入 --allow-fallback 才允许降级运行。
 *
 * 用法：
 *   node tools/extract-form-fields.js [--views-root=<path>] [--allow-fallback] [--dry-run]
 *
 *   --views-root=<path>  指定真实 Vue 工程的 views 目录（默认 ../yudao-ui-admin-vue3/src/views）
 *   --allow-fallback     真实 Vue 工程缺失时仍继续（降级为表头推断，仅供应急）
 *   --dry-run            只报告将要生成的内容，不写盘
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const PAGES_ROOT = path.join(__dirname, '../pages/admin');
const DEFAULT_VIEWS_ROOT = path.join(__dirname, '../yudao-ui-admin-vue3/src/views');
const OUTPUT_FILE = path.join(__dirname, '../js/page-fields-config.js');

const argv = process.argv.slice(2);
const viewsRootArg = argv.find((a) => a.startsWith('--views-root='));
const VIEWS_ROOT = viewsRootArg
    ? path.resolve(process.cwd(), viewsRootArg.split('=').slice(1).join('='))
    : DEFAULT_VIEWS_ROOT;
const ALLOW_FALLBACK = argv.includes('--allow-fallback');
const DEBUG = argv.includes('--debug');
const DRY_RUN = argv.includes('--dry-run');

/** 校验真实 Vue 工程是否可用；不可用且未显式允许降级时直接退出 */
function assertViewsRootUsable() {
    const viewsExists = fs.existsSync(VIEWS_ROOT);
    const projectRoot = path.resolve(VIEWS_ROOT, '../..');
    const projectExists = fs.existsSync(projectRoot);

    if (viewsExists) {
        const n = globFiles(VIEWS_ROOT, '**/*Form.vue').length;
        if (n > 0) {
            console.log(`✓ 真实 Vue 工程可用: ${projectRoot}（${n} 个 Form 组件）`);
            return true;
        }
        console.warn(`⚠ views 目录存在但未找到任何 *Form.vue: ${VIEWS_ROOT}`);
    } else {
        console.error(`✗ 找不到真实 Vue 工程的 views 目录: ${VIEWS_ROOT}`);
        console.error(`  该工程通常不入库（见 .gitignore 的 yudao-ui-admin-vue3/ 条目）。`);
    }

    if (ALLOW_FALLBACK) {
        console.warn('\n⚠ 已指定 --allow-fallback：继续运行，但所有字段将由 <th> 表头推断，');
        console.warn('  控件类型、必填、字典选项等真实信息会丢失，产物质量显著下降。\n');
        return false;
    }

    console.error('\n为避免产出失真的配置，脚本已中止。');
    console.error('请选择其一：');
    console.error('  1) 克隆/软链真实 Vue 工程到项目根目录的 yudao-ui-admin-vue3/，然后重跑；');
    console.error('  2) 用 --views-root=<path> 指向其 views 目录；');
    console.error('  3) 确知后果时，加 --allow-fallback 降级运行。\n');
    process.exit(1);
}

// 字典类型到选项的映射
const DICT_OPTIONS = {
    'COMMON_STATUS': ['开启', '关闭'],
    'SYSTEM_USER_SEX': ['男', '女'],
    'SYSTEM_TENANT_PACKAGE_TYPE': ['体验版', '标准版', '专业版', '旗舰版'],
    'SYSTEM_ERROR_CODE_TYPE': ['系统', '业务'],
    'SYSTEM_MENU_TYPE': ['目录', '菜单', '按钮'],
    'SYSTEM_ROLE_TYPE': ['系统内置', '业务自定义'],
    'SYSTEM_NOTICE_TYPE': ['通知', '公告'],
    'BPM_MODEL_TYPE': ['流程设计', '流程复用'],
    'CRM_CUSTOMER_LEVEL': ['A级（重点客户）', 'B级（普通客户）', 'C级（非优先客户）'],
    'CRM_CUSTOMER_SOURCE': ['线下活动', '线上推广', '老客户介绍', '其他'],
    'CRM_CUSTOMER_INDUSTRY': ['互联网', '金融', '制造业', '零售', '其他'],
    'CRM_BUSINESS_STATUS': ['商务谈判中', '商务谈判失败', '商务谈判成功'],
    'CRM_PRODUCT_UNIT': ['个', '台', '件', '套', '批', 'kg', 'g', 'm', 'km', '吨'],
    'MALL_PRODUCT_UNIT': ['个', '台', '件', '套', '批'],
    'INFRA_JOB_STATUS': ['启动中', '已暂停', '执行中', '执行失败', '执行成功'],
    'INFRA_JOB_LOG_STATUS': ['执行失败', '执行成功'],
    'MEMBER_USER_LEVEL': ['普通会员', '白银会员', '黄金会员', '钻石会员'],
    'PAY_CHANNEL_CODE': ['wx_pub', 'wx_lite', 'alipay_pc', 'alipay_app', 'alipay_wap'],
    'PAY_TRANSFER_STATUS': ['等待转账', '转账成功', '转账失败'],
    'MP_MESSAGE_TYPE': ['text', 'image', 'voice', 'video', 'shortvideo', 'location', 'link', 'event'],
    'MP_AUTO_REPLY_KEYWORD_TYPE': ['匹配全部', '半匹配', '精确匹配'],
    'MP_AUTO_REPLY_TYPE': ['text', 'image', 'voice', 'video', 'news'],
    'MP_MATERIAL_TYPE': ['image', 'voice', 'video', 'news'],
};

// 缓存：页面标题 -> HTML信息（允许重复标题，保留最后一个）
const pageMap = new Map();

// 缓存：重复标题的警告
const duplicateTitles = new Set();

// 缓存：模块 -> Vue Form 文件列表
const formFilesMap = new Map();

/**
 * 扫描所有 HTML 页面，提取标题和表头
 */
function scanHtmlPages() {
    console.log('扫描 HTML 页面...');
    const htmlFiles = globFiles(PAGES_ROOT, '**/*.html');

    for (const file of htmlFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // 提取 <title>
        const titleMatch = content.match(/<title>(.+?)<\/title>/);
        if (!titleMatch) continue;
        const fullTitle = titleMatch[1];
        const title = fullTitle.replace(' - 芋道管理后台', '').trim();

        // 提取 <th> 表头
        const headers = [];
        const thRegex = /<th[^>]*>(.+?)<\/th>/g;
        let match;
        while ((match = thRegex.exec(content)) !== null) {
            let thText = match[1].replace(/<[^>]+>/g, '').trim();
            if (thText && thText !== '操作' && !thText.includes('checkbox')) {
                headers.push(thText);
            }
        }

        // 提取相对路径（从 pages/admin 开始）
        const relPath = path.relative(PAGES_ROOT, file).replace(/\\/g, '/');

        // 检查重复标题
        if (pageMap.has(title)) {
            duplicateTitles.add(title);
        }

        pageMap.set(title, {
            title,
            fullTitle,
            relPath,
            headers,
            file
        });
    }

    console.log(`  找到 ${pageMap.size} 个页面`);
    if (duplicateTitles.size > 0) {
        console.log(`  警告: 发现 ${duplicateTitles.size} 个重复标题:`);
        for (const title of duplicateTitles) {
            console.log(`    - "${title}"`);
        }
    }
}

/**
 * 扫描所有 Vue Form 组件
 */
function scanVueForms() {
    console.log('扫描 Vue Form 组件...');
    const vueFiles = globFiles(VIEWS_ROOT, '**/*Form.vue');

    for (const file of vueFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // 只处理包含 el-form 的文件
        if (!content.includes('<el-form')) continue;

        // 提取模块名（从 views 下一级目录）
        let relPath = path.relative(VIEWS_ROOT, file);
        // 统一路径分隔符为正斜杠
        relPath = relPath.replace(/\\/g, '/');

        const match = relPath.match(/^([^/]+)\//);
        if (!match) {
            console.log(`    [WARN] 跳过文件（无法提取模块）: ${relPath}`);
            continue;
        }
        const module = match[1];

        if (!formFilesMap.has(module)) {
            formFilesMap.set(module, []);
        }
        formFilesMap.get(module).push({
            file,
            content,
            relPath: relPath.replace(/\\/g, '/')
        });
    }

    console.log(`  找到 ${vueFiles.length} 个 Vue Form 组件`);
    console.log(`  formFilesMap 有 ${formFilesMap.size} 个模块`);
    if (formFilesMap.size === 0) {
        console.warn('    ⚠ 未匹配到任何模块，字段将退化为表头推断');
    }
}

/**
 * 从 Vue Form 组件提取字段定义
 */
function extractFieldsFromVueForm(vueForm, pageTitle) {
    const fields = [];
    const content = vueForm.content;

    // 提取所有 el-form-item
    const formItemRegex = /<el-form-item[^>]*\s+label="([^"]+)"[^>]*\s+prop="([^"]+)"[^>]*>([\s\S]*?)<\/el-form-item>/g;
    let match;

    // 收集所有 prop 用于后续判断 required
    const rulesRegex = /(\w+):\s*\[\s*\{\s*required:\s*true/g;
    const requiredProps = new Set();
    let rulesMatch;
    const rulesContent = content.substring(0, 5000); // 只看前5KB，通常 script 在前面
    while ((rulesMatch = rulesRegex.exec(rulesContent)) !== null) {
        requiredProps.add(rulesMatch[1]);
    }

    while ((match = formItemRegex.exec(content)) !== null) {
        const label = match[1];
        const prop = match[2];
        const itemContent = match[3];

        const field = { label };

        // 判断是否必填
        if (requiredProps.has(prop)) {
            field.required = true;
        }

        // 推断字段类型
        if (itemContent.includes('<el-select')) {
            field.type = 'select';

            // 提取选项
            const options = [];
            const optionRegex = /<el-option[^>]*\s+:label="([^"]+)"/g;
            let optMatch;
            while ((optMatch = optionRegex.exec(itemContent)) !== null) {
                options.push(optMatch[1]);
            }
            if (options.length > 0) {
                field.options = options;
            } else {
                // 尝试从 DICT_TYPE 提取
                const dictMatch = itemContent.match(/DICT_TYPE\.(\w+)/);
                if (dictMatch && DICT_OPTIONS[dictMatch[1]]) {
                    field.options = DICT_OPTIONS[dictMatch[1]];
                }
            }
        } else if (itemContent.includes('type="textarea"')) {
            field.type = 'textarea';
        } else if (itemContent.includes('<el-date-picker')) {
            field.type = 'date';
        } else if (itemContent.includes('<el-input-number')) {
            field.type = 'number';
        } else if (itemContent.includes('<el-tree-select')) {
            field.type = 'select';
        } else if (itemContent.includes('<el-radio-group')) {
            field.type = 'radio';
            // 提取 radio 选项
            const radioOptions = [];
            const radioRegex = /<el-radio[^>]*\s+:label="([^"]+)"/g;
            let radioMatch;
            while ((radioMatch = radioRegex.exec(itemContent)) !== null) {
                radioOptions.push(radioMatch[1]);
            }
            if (radioOptions.length > 0) {
                field.options = radioOptions;
            }
        } else if (itemContent.includes('<el-checkbox-group')) {
            field.type = 'checkbox';
        } else {
            field.type = 'input';
        }

        fields.push(field);
    }

    return fields;
}

/**
 * 尝试为页面匹配 Vue Form 组件
 */
function findFormForPage(pageTitle) {
    const page = pageMap.get(pageTitle);
    if (!page) return null;

    const module = page.relPath.split('/')[0];
    const formFiles = formFilesMap.get(module);

    if (!formFiles || formFiles.length === 0) {
        if (DEBUG) console.log(`    [DEBUG] ${pageTitle}: module=${module}, no form files found`);
        return null;
    }

    // 尝试按文件名匹配
    const pageName = path.basename(page.relPath, '.html');

    // 1. 精确匹配：{Page}Form.vue 或 {page}Form.vue
    for (const formFile of formFiles) {
        const formName = path.basename(formFile.relPath, '.vue');
        const targetName = pageName + 'Form';
        // 移除连字符后再比较
        const formNameNormalized = formName.toLowerCase().replace(/-/g, '');
        const targetNameNormalized = targetName.toLowerCase().replace(/-/g, '');
        if (formNameNormalized === targetNameNormalized) {
            if (DEBUG) console.log(`    [DEBUG] ${pageTitle}: matched ${formFile.relPath} (exact)`);
            return formFile;
        }
    }

    // 2. 子目录匹配：{subdir}/{Page}Form.vue
    for (const formFile of formFiles) {
        const relPath = formFile.relPath;
        const parts = relPath.split('/');
        if (parts.length === 2) {
            const formName = path.basename(parts[1], '.vue');
            const targetName = pageName + 'Form';
            if (formName.toLowerCase() === targetName.toLowerCase()) {
                if (DEBUG) console.log(`    [DEBUG] ${pageTitle}: matched ${formFile.relPath} (subdir)`);
                return formFile;
            }
        }
    }

    // 3. 模糊匹配：Form 文件名包含页面名
    for (const formFile of formFiles) {
        const formName = path.basename(formFile.relPath, '.vue').toLowerCase();
        const pageNameLower = pageName.toLowerCase().replace(/-/g, '');
        const formNameNormalized = formName.replace(/-/g, '').replace('form', '');
        if (formName.includes(pageNameLower) || formNameNormalized.includes(pageNameLower) || pageNameLower.includes(formNameNormalized)) {
            if (DEBUG) console.log(`    [DEBUG] ${pageTitle}: matched ${formFile.relPath} (fuzzy)`);
            return formFile;
        }
    }

    if (DEBUG) console.log(`    [DEBUG] ${pageTitle}: no match found (pageName=${pageName}, forms=${formFiles.map(f => path.basename(f.relPath)).join(', ')})`);
    return null;
}

/**
 * 生成配置文件
 */
function generateConfig() {
    console.log('生成配置文件...');
    const config = {};

    let withForm = 0;
    let withoutForm = 0;

    for (const [title, page] of pageMap) {
        // 跳过特殊页面
        if (['首页', '登录', '个人中心', '404', '500'].includes(title)) continue;

        const vueForm = findFormForPage(title);

        const pageConfig = {
            headers: page.headers,
            entityName: title.replace(/管理$/, '') || title
        };

        if (vueForm) {
            pageConfig.fields = extractFieldsFromVueForm(vueForm, title);
            withForm++;
        } else {
            // 无对应 Form，使用表头推断
            pageConfig.fields = inferFieldsFromHeaders(page.headers);
            withoutForm++;
        }

        config[title] = pageConfig;
    }

    // 输出 JS 文件
    const output = `// 自动生成于 ${new Date().toISOString()}
// 从 Vue Form 组件提取的表单字段配置

window.PAGE_FIELDS_CONFIG = ${JSON.stringify(config, null, 4)};

console.log('字段配置加载完成:', Object.keys(window.PAGE_FIELDS_CONFIG).length, '个页面');
`;

    if (DRY_RUN) {
        console.log('  (dry-run 模式，未写入文件)');
    } else {
        fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
        console.log(`  生成完成: ${OUTPUT_FILE}`);
    }
    console.log(`  有 Form 组件: ${withForm} 个页面`);
    console.log(`  无 Form 组件: ${withoutForm} 个页面（使用表头推断）`);
    if (withoutForm > 0) {
        console.warn(`  ⚠ ${withoutForm} 个页面依赖表头推断，其控件类型/必填/字典选项可能与真实系统不符。`);
    }
}

/**
 * 从表头推断字段
 */
function inferFieldsFromHeaders(headers) {
    const fields = [];

    for (const header of headers) {
        // 跳过 ID、时间、操作类字段
        if (header.includes('编号') || header.includes('ID') ||
            header.includes('时间') || header.includes('日期') ||
            header.includes('创建人') || header.includes('更新')) {
            continue;
        }

        let type = 'input';
        if (header.includes('状态')) {
            type = 'select';
        } else if (header.includes('备注') || header.includes('描述') || header.includes('内容')) {
            type = 'textarea';
        } else if (header.includes('时间') || header.includes('日期')) {
            type = 'date';
        }

        const field = { label: header, type };

        // 名称、编码类字段通常必填
        if (header.includes('名称') || header.includes('编码')) {
            field.required = true;
        }

        // 状态字段添加选项
        if (header.includes('状态')) {
            field.options = ['开启', '关闭'];
        }

        fields.push(field);
    }

    // 如果推断不出字段，使用通用默认值
    if (fields.length === 0) {
        return [
            { label: '名称', required: true, type: 'input' },
            { label: '编码', type: 'input' },
            { label: '排序', required: true, type: 'input' },
            { label: '状态', type: 'select', options: ['开启', '关闭'] },
            { label: '备注', type: 'textarea' }
        ];
    }

    return fields;
}

/**
 * 递归 glob 文件
 */
function globFiles(root, pattern) {
    const { glob } = require('glob');
    const results = glob.sync(pattern, {
        cwd: root,
        absolute: true,
        windowsPathsNoEscape: true
    });
    return results;
}

/**
 * 主函数
 */
function main() {
    console.log('========== 开始提取表单字段 ==========');
    console.log();

    // 真实 Vue 工程缺失时默认中止，避免静默产出低质量配置
    assertViewsRootUsable();

    scanHtmlPages();
    scanVueForms();
    generateConfig();

    console.log();
    console.log('========== 完成 ==========');
}

// 运行
main();
