// 自动生成于 2026-04-23T00:52:13.024Z
// 从 Vue Form 组件提取的表单字段配置

window.PAGE_FIELDS_CONFIG = {
    "跳转中...": {
        "headers": [],
        "entityName": "跳转中...",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "用户管理": {
        "headers": [
            "用户编号",
            "用户名称",
            "用户昵称",
            "部门",
            "手机号码",
            "状态",
            "创建时间"
        ],
        "entityName": "用户",
        "fields": [
            {
                "label": "用户昵称",
                "required": true,
                "type": "input"
            },
            {
                "label": "归属部门",
                "type": "select"
            },
            {
                "label": "手机号码",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "用户名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "用户密码",
                "required": true,
                "type": "input"
            }
        ]
    },
    "租户管理": {
        "headers": [
            "租户编号",
            "租户名",
            "租户套餐",
            "联系人",
            "联系手机",
            "账号额度",
            "绑定域名",
            "租户状态"
        ],
        "entityName": "租户",
        "fields": [
            {
                "label": "租户名",
                "required": true,
                "type": "input"
            },
            {
                "label": "租户套餐",
                "required": true,
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "联系人",
                "required": true,
                "type": "input"
            },
            {
                "label": "联系手机",
                "type": "input"
            },
            {
                "label": "用户名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "用户密码",
                "required": true,
                "type": "input"
            },
            {
                "label": "账号额度",
                "required": true,
                "type": "number"
            },
            {
                "label": "过期时间",
                "required": true,
                "type": "date"
            },
            {
                "label": "绑定域名",
                "type": "input"
            },
            {
                "label": "租户状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "租户套餐管理": {
        "headers": [
            "套餐编号",
            "套餐名",
            "状态",
            "备注"
        ],
        "entityName": "租户套餐",
        "fields": [
            {
                "label": "套餐名",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "备注",
                "type": "input"
            }
        ]
    },
    "社交用户管理": {
        "headers": [
            "编号",
            "社交平台",
            "OpenID",
            "昵称",
            "头像",
            "绑定用户",
            "创建时间"
        ],
        "entityName": "社交用户",
        "fields": [
            {
                "label": "用户昵称",
                "required": true,
                "type": "input"
            },
            {
                "label": "归属部门",
                "type": "select"
            },
            {
                "label": "手机号码",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "用户名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "用户密码",
                "required": true,
                "type": "input"
            }
        ]
    },
    "社交客户端管理": {
        "headers": [
            "编号",
            "社交平台",
            "客户端ID",
            "用户编号",
            "昵称",
            "头像",
            "绑定时间"
        ],
        "entityName": "社交客户端",
        "fields": [
            {
                "label": "应用名",
                "required": true,
                "type": "input"
            },
            {
                "label": "社交平台",
                "required": true,
                "type": "radio"
            },
            {
                "label": "用户类型",
                "required": true,
                "type": "radio"
            },
            {
                "label": "客户端编号",
                "required": true,
                "type": "input"
            },
            {
                "label": "客户端密钥",
                "required": true,
                "type": "input"
            },
            {
                "label": "agentId",
                "type": "input"
            },
            {
                "label": "publicKey",
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "短信模板管理": {
        "headers": [
            "编号",
            "模板名称",
            "模板编码",
            "模板内容",
            "短信类型",
            "渠道编码",
            "状态"
        ],
        "entityName": "短信模板",
        "fields": [
            {
                "label": "短信渠道编号",
                "required": true,
                "type": "select",
                "options": [
                    "\r\n              channel.signature +\r\n              `【 ${getDictLabel(DICT_TYPE.SYSTEM_SMS_CHANNEL_CODE, channel.code)}】`\r\n            "
                ]
            },
            {
                "label": "短信类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "模板编号",
                "required": true,
                "type": "input"
            },
            {
                "label": "模板名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "模板内容",
                "required": true,
                "type": "textarea"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "短信 API 模板编号",
                "required": true,
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            }
        ]
    },
    "短信发送日志": {
        "headers": [
            "编号",
            "手机号",
            "模板编码",
            "短信内容",
            "发送状态",
            "发送时间",
            "接收状态"
        ],
        "entityName": "短信发送日志",
        "fields": [
            {
                "label": "手机号",
                "type": "input"
            },
            {
                "label": "模板编码",
                "type": "input",
                "required": true
            },
            {
                "label": "短信内容",
                "type": "textarea"
            },
            {
                "label": "发送状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "接收状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "短信渠道管理": {
        "headers": [
            "编号",
            "短信签名",
            "渠道编码",
            "启用状态",
            "备注"
        ],
        "entityName": "短信渠道",
        "fields": [
            {
                "label": "短信签名",
                "required": true,
                "type": "input"
            },
            {
                "label": "渠道编码",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "备注",
                "type": "input"
            },
            {
                "label": "短信 API 的账号",
                "required": true,
                "type": "input"
            },
            {
                "label": "短信 API 的密钥",
                "type": "input"
            },
            {
                "label": "短信发送回调 URL",
                "type": "input"
            }
        ]
    },
    "角色管理": {
        "headers": [
            "编号",
            "角色名称",
            "角色标识",
            "分类",
            "欢迎语",
            "排序",
            "状态",
            "创建时间"
        ],
        "entityName": "角色",
        "fields": [
            {
                "label": "角色名称",
                "type": "input"
            },
            {
                "label": "角色头像",
                "type": "input"
            },
            {
                "label": "绑定模型",
                "type": "select",
                "options": [
                    "model.name"
                ]
            },
            {
                "label": "角色类别",
                "type": "input"
            },
            {
                "label": "角色描述",
                "type": "textarea"
            },
            {
                "label": "角色设定",
                "type": "textarea"
            },
            {
                "label": "引用知识库",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "引用工具",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "引用 MCP",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "是否公开",
                "type": "radio"
            },
            {
                "label": "角色排序",
                "type": "number"
            },
            {
                "label": "开启状态",
                "type": "radio"
            }
        ]
    },
    "岗位管理": {
        "headers": [
            "岗位编号",
            "岗位名称",
            "岗位编码",
            "岗位顺序",
            "岗位备注",
            "状态",
            "创建时间"
        ],
        "entityName": "岗位",
        "fields": [
            {
                "label": "岗位标题",
                "required": true,
                "type": "input"
            },
            {
                "label": "岗位编码",
                "required": true,
                "type": "input"
            },
            {
                "label": "岗位顺序",
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "操作日志": {
        "headers": [
            "日志编号",
            "操作人",
            "操作模块",
            "操作名",
            "操作内容",
            "业务编号",
            "操作 IP"
        ],
        "entityName": "操作日志",
        "fields": [
            {
                "label": "操作人",
                "type": "input"
            },
            {
                "label": "操作模块",
                "type": "input"
            },
            {
                "label": "操作名",
                "type": "input"
            },
            {
                "label": "操作内容",
                "type": "textarea"
            },
            {
                "label": "操作 IP",
                "type": "input"
            }
        ]
    },
    "OAuth2 令牌管理": {
        "headers": [
            "编号",
            "访问令牌",
            "刷新令牌",
            "用户编号",
            "用户类型",
            "客户端编号",
            "过期时间"
        ],
        "entityName": "OAuth2 令牌",
        "fields": [
            {
                "label": "访问令牌",
                "type": "input"
            },
            {
                "label": "刷新令牌",
                "type": "input"
            },
            {
                "label": "用户类型",
                "type": "input"
            }
        ]
    },
    "OAuth2 客户端管理": {
        "headers": [
            "客户端编号",
            "客户端密钥",
            "应用名",
            "应用图标",
            "状态",
            "访问令牌的有效期",
            "刷新令牌的有效期",
            "授权类型"
        ],
        "entityName": "OAuth2 客户端",
        "fields": [
            {
                "label": "客户端编号",
                "type": "input"
            },
            {
                "label": "客户端密钥",
                "type": "input"
            },
            {
                "label": "应用名",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "radio"
            },
            {
                "label": "访问令牌的有效期",
                "type": "number"
            },
            {
                "label": "刷新令牌的有效期",
                "type": "number"
            },
            {
                "label": "授权类型",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "授权范围",
                "type": "select",
                "options": [
                    "scope"
                ]
            },
            {
                "label": "自动授权范围",
                "type": "select",
                "options": [
                    "scope"
                ]
            },
            {
                "label": "可重定向的 URI 地址",
                "type": "select",
                "options": [
                    "redirectUri"
                ]
            },
            {
                "label": "权限",
                "type": "select",
                "options": [
                    "authority"
                ]
            },
            {
                "label": "资源",
                "type": "select",
                "options": [
                    "resourceId"
                ]
            },
            {
                "label": "附加信息",
                "type": "textarea"
            }
        ]
    },
    "站内信模板管理": {
        "headers": [
            "编号",
            "模板名称",
            "模板编码",
            "模板内容",
            "类型",
            "状态",
            "创建时间"
        ],
        "entityName": "站内信模板",
        "fields": [
            {
                "label": "模版编码",
                "required": true,
                "type": "input"
            },
            {
                "label": "模板名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "发件人名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "模板内容",
                "required": true,
                "type": "textarea"
            },
            {
                "label": "类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "备注",
                "type": "input"
            }
        ]
    },
    "站内信管理": {
        "headers": [
            "编号",
            "用户编号",
            "模板编号",
            "模板编码",
            "消息标题",
            "消息内容",
            "类型",
            "是否已读",
            "创建时间"
        ],
        "entityName": "站内信",
        "fields": [
            {
                "label": "模板编码",
                "type": "input",
                "required": true
            },
            {
                "label": "消息标题",
                "type": "input"
            },
            {
                "label": "消息内容",
                "type": "textarea"
            },
            {
                "label": "类型",
                "type": "input"
            },
            {
                "label": "是否已读",
                "type": "input"
            }
        ]
    },
    "通知公告": {
        "headers": [
            "公告编号",
            "公告标题",
            "状态",
            "发布时间",
            "已读人数"
        ],
        "entityName": "通知公告",
        "fields": [
            {
                "label": "公告标题",
                "required": true,
                "type": "input"
            },
            {
                "label": "公告内容",
                "required": true,
                "type": "input"
            },
            {
                "label": "发布时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "菜单管理": {
        "headers": [
            "编号",
            "菜单名称",
            "菜单类型",
            "菜单Key",
            "排序",
            "状态"
        ],
        "entityName": "菜单",
        "fields": [
            {
                "label": "菜单名称",
                "type": "input",
                "required": true
            },
            {
                "label": "菜单类型",
                "type": "input"
            },
            {
                "label": "菜单Key",
                "type": "input"
            },
            {
                "label": "排序",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "邮件模板管理": {
        "headers": [
            "邮箱账号",
            "模板名称",
            "模板编码",
            "模板标题",
            "开启状态"
        ],
        "entityName": "邮件模板",
        "fields": [
            {
                "label": "邮箱账号",
                "required": true,
                "type": "select",
                "options": [
                    "account.mail"
                ]
            },
            {
                "label": "模板编码",
                "required": true,
                "type": "input"
            },
            {
                "label": "模板名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "发送人名称",
                "type": "input"
            },
            {
                "label": "模板标题",
                "required": true,
                "type": "input"
            },
            {
                "label": "模板内容",
                "required": true,
                "type": "input"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "邮件发送日志": {
        "headers": [
            "编号",
            "收件人邮箱",
            "模板编码",
            "发送状态",
            "发送时间"
        ],
        "entityName": "邮件发送日志",
        "fields": [
            {
                "label": "收件人邮箱",
                "type": "input"
            },
            {
                "label": "模板编码",
                "type": "input",
                "required": true
            },
            {
                "label": "发送状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "邮箱账号管理": {
        "headers": [
            "编号",
            "邮箱",
            "用户名",
            "SMTP主机",
            "SMTP端口",
            "SSL",
            "状态"
        ],
        "entityName": "邮箱账号",
        "fields": [
            {
                "label": "邮箱",
                "required": true,
                "type": "input"
            },
            {
                "label": "用户名",
                "required": true,
                "type": "input"
            },
            {
                "label": "密码",
                "required": true,
                "type": "input"
            },
            {
                "label": "SMTP 服务器域名",
                "required": true,
                "type": "input"
            },
            {
                "label": "SMTP 服务器端口",
                "required": true,
                "type": "number"
            }
        ]
    },
    "登录日志": {
        "headers": [
            "日志编号",
            "登录类型",
            "用户名称",
            "登录地址",
            "浏览器",
            "登陆结果"
        ],
        "entityName": "登录日志",
        "fields": [
            {
                "label": "登录类型",
                "type": "input"
            },
            {
                "label": "用户名称",
                "type": "input",
                "required": true
            },
            {
                "label": "登录地址",
                "type": "input"
            },
            {
                "label": "浏览器",
                "type": "input"
            },
            {
                "label": "登陆结果",
                "type": "input"
            }
        ]
    },
    "错误码管理": {
        "headers": [
            "编号",
            "错误码",
            "错误提示",
            "应用名",
            "请求URL",
            "状态",
            "创建时间"
        ],
        "entityName": "错误码",
        "fields": [
            {
                "label": "错误码",
                "type": "input"
            },
            {
                "label": "错误提示",
                "type": "input"
            },
            {
                "label": "应用名",
                "type": "input"
            },
            {
                "label": "请求URL",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "字典管理": {
        "headers": [
            "字典编号",
            "字典名称",
            "字典类型",
            "状态",
            "备注",
            "创建时间"
        ],
        "entityName": "字典",
        "fields": [
            {
                "label": "字典名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "字典类型",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "字典数据管理": {
        "headers": [
            "字典编码",
            "字典标签",
            "字典键值",
            "字典排序",
            "状态",
            "颜色类型",
            "CSS Class",
            "备注"
        ],
        "entityName": "字典数据",
        "fields": [
            {
                "label": "字典类型",
                "type": "input"
            },
            {
                "label": "数据标签",
                "required": true,
                "type": "input"
            },
            {
                "label": "数据键值",
                "required": true,
                "type": "input"
            },
            {
                "label": "显示排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "颜色类型",
                "type": "select",
                "options": [
                    "item.label + '(' + item.value + ')'"
                ]
            },
            {
                "label": "CSS Class",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "部门管理": {
        "headers": [
            "部门名称",
            "负责人",
            "排序",
            "状态",
            "创建时间"
        ],
        "entityName": "部门",
        "fields": [
            {
                "label": "上级部门",
                "required": true,
                "type": "select"
            },
            {
                "label": "部门名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "显示排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "联系电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            }
        ]
    },
    "地区管理": {
        "headers": [
            "编号",
            "地区名称",
            "区号",
            "邮编",
            "层级",
            "上级地区",
            "创建时间"
        ],
        "entityName": "地区",
        "fields": [
            {
                "label": "IP",
                "required": true,
                "type": "input"
            },
            {
                "label": "地址",
                "type": "input"
            }
        ]
    },
    "JimuReport 积木报表": {
        "headers": [
            "编号",
            "报表名称",
            "报表分组",
            "状态",
            "创建时间"
        ],
        "entityName": "JimuReport 积木报表",
        "fields": [
            {
                "label": "报表名称",
                "type": "input",
                "required": true
            },
            {
                "label": "报表分组",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "报表设计器": {
        "headers": [
            "报表编号",
            "报表名称",
            "报表类型",
            "分类",
            "状态",
            "创建人",
            "创建时间"
        ],
        "entityName": "报表设计器",
        "fields": [
            {
                "label": "报表名称",
                "type": "input",
                "required": true
            },
            {
                "label": "报表类型",
                "type": "input"
            },
            {
                "label": "分类",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "仪表盘设计器": {
        "headers": [
            "仪表盘编号",
            "仪表盘名称",
            "分类",
            "状态",
            "创建人",
            "创建时间"
        ],
        "entityName": "仪表盘设计器",
        "fields": [
            {
                "label": "仪表盘名称",
                "type": "input",
                "required": true
            },
            {
                "label": "分类",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "GoView 大屏设计": {
        "headers": [
            "编号",
            "大屏名称",
            "大屏分组",
            "状态",
            "创建时间"
        ],
        "entityName": "GoView 大屏设计",
        "fields": [
            {
                "label": "大屏名称",
                "type": "input",
                "required": true
            },
            {
                "label": "大屏分组",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "充值套餐": {
        "headers": [
            "编号",
            "套餐名",
            "支付金额",
            "赠送金额",
            "状态",
            "创建时间"
        ],
        "entityName": "充值套餐",
        "fields": [
            {
                "label": "套餐名",
                "required": true,
                "type": "input"
            },
            {
                "label": "支付金额(元)",
                "required": true,
                "type": "number"
            },
            {
                "label": "赠送金额(元)",
                "required": true,
                "type": "number"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "钱包余额": {
        "headers": [
            "编号",
            "用户编号",
            "用户类型",
            "余额",
            "累计支出",
            "累计充值",
            "冻结金额",
            "创建时间"
        ],
        "entityName": "钱包余额",
        "fields": [
            {
                "label": "用户类型",
                "type": "input"
            },
            {
                "label": "余额",
                "type": "input"
            },
            {
                "label": "累计支出",
                "type": "input"
            },
            {
                "label": "累计充值",
                "type": "input"
            },
            {
                "label": "冻结金额",
                "type": "input"
            }
        ]
    },
    "转账订单": {
        "headers": [
            "编号",
            "支付应用",
            "转账金额",
            "转账状态",
            "订单号",
            "收款人姓名",
            "收款账号",
            "转账标题",
            "转账渠道"
        ],
        "entityName": "转账订单",
        "fields": [
            {
                "label": "支付应用",
                "type": "input"
            },
            {
                "label": "转账金额",
                "type": "input"
            },
            {
                "label": "转账状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "订单号",
                "type": "input"
            },
            {
                "label": "收款人姓名",
                "type": "input"
            },
            {
                "label": "收款账号",
                "type": "input"
            },
            {
                "label": "转账标题",
                "type": "input"
            },
            {
                "label": "转账渠道",
                "type": "input"
            }
        ]
    },
    "退款订单": {
        "headers": [
            "编号",
            "创建时间",
            "支付金额",
            "退款金额",
            "退款订单号",
            "支付订单号",
            "退款状态",
            "退款渠道",
            "成功时间",
            "支付应用"
        ],
        "entityName": "退款订单",
        "fields": [
            {
                "label": "支付金额",
                "type": "input"
            },
            {
                "label": "退款金额",
                "type": "input"
            },
            {
                "label": "退款订单号",
                "type": "input"
            },
            {
                "label": "支付订单号",
                "type": "input"
            },
            {
                "label": "退款状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "退款渠道",
                "type": "input"
            },
            {
                "label": "支付应用",
                "type": "input"
            }
        ]
    },
    "支付订单": {
        "headers": [
            "编号",
            "创建时间",
            "支付金额",
            "退款金额",
            "手续金额",
            "订单号",
            "支付状态",
            "支付渠道",
            "支付时间",
            "支付应用",
            "商品标题"
        ],
        "entityName": "支付订单",
        "fields": [
            {
                "label": "支付金额",
                "type": "input"
            },
            {
                "label": "退款金额",
                "type": "input"
            },
            {
                "label": "手续金额",
                "type": "input"
            },
            {
                "label": "订单号",
                "type": "input"
            },
            {
                "label": "支付状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "支付渠道",
                "type": "input"
            },
            {
                "label": "支付应用",
                "type": "input"
            },
            {
                "label": "商品标题",
                "type": "input"
            }
        ]
    },
    "回调通知": {
        "headers": [
            "任务编号",
            "应用编号",
            "商户单信息",
            "通知类型",
            "关联编号",
            "通知状态",
            "最后通知时间",
            "下次通知时间",
            "通知次数"
        ],
        "entityName": "回调通知",
        "fields": [
            {
                "label": "商户单信息",
                "type": "input"
            },
            {
                "label": "通知类型",
                "type": "input"
            },
            {
                "label": "通知状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "通知次数",
                "type": "input"
            }
        ]
    },
    "商户信息": {
        "headers": [
            "编号",
            "商户编号",
            "商户名称",
            "支付渠道",
            "商户号",
            "状态",
            "创建时间"
        ],
        "entityName": "商户信息",
        "fields": [
            {
                "label": "商户名称",
                "type": "input",
                "required": true
            },
            {
                "label": "支付渠道",
                "type": "input"
            },
            {
                "label": "商户号",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "支付渠道": {
        "headers": [
            "编号",
            "渠道编码",
            "渠道名称",
            "支付方式",
            "配置状态",
            "状态"
        ],
        "entityName": "支付渠道",
        "fields": [
            {
                "label": "渠道费率",
                "type": "input"
            },
            {
                "label": "微信 APPID",
                "type": "input"
            },
            {
                "label": "商户号",
                "type": "input"
            },
            {
                "label": "渠道状态",
                "type": "radio"
            },
            {
                "label": "API 版本",
                "type": "radio"
            },
            {
                "label": "商户密钥",
                "type": "input"
            },
            {
                "label": "apiclient_cert.p12 证书",
                "type": "textarea"
            },
            {
                "label": "API V3 密钥",
                "type": "input"
            },
            {
                "label": "apiclient_key.pem 证书",
                "type": "textarea"
            },
            {
                "label": "证书序列号",
                "type": "input"
            },
            {
                "label": "public_key.pem 证书",
                "type": "textarea"
            },
            {
                "label": "公钥 ID",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            }
        ]
    },
    "收银台": {
        "headers": [
            "编号",
            "商户单号",
            "应用名称",
            "支付金额",
            "商品描述",
            "过期时间",
            "创建时间"
        ],
        "entityName": "收银台",
        "fields": [
            {
                "label": "商户单号",
                "type": "input"
            },
            {
                "label": "应用名称",
                "type": "input",
                "required": true
            },
            {
                "label": "支付金额",
                "type": "input"
            },
            {
                "label": "商品描述",
                "type": "textarea"
            }
        ]
    },
    "应用信息": {
        "headers": [
            "应用标识",
            "应用名",
            "开启状态",
            "支付宝配置App | PC | WAP | QR | 条码",
            "微信配置小程序 | 公众号 | App | Native | WAP | 条码",
            "钱包支付",
            "模拟支付"
        ],
        "entityName": "应用信息",
        "fields": [
            {
                "label": "应用名",
                "required": true,
                "type": "input"
            },
            {
                "label": "应用标识",
                "required": true,
                "type": "input"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "支付结果的回调地址",
                "required": true,
                "type": "input"
            },
            {
                "label": "退款结果的回调地址",
                "required": true,
                "type": "input"
            },
            {
                "label": "转账结果的回调地址",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            }
        ]
    },
    "粉丝管理": {
        "headers": [
            "编号",
            "用户标识",
            "用户头像",
            "昵称",
            "备注",
            "标签",
            "订阅状态"
        ],
        "entityName": "粉丝",
        "fields": [
            {
                "label": "昵称",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            },
            {
                "label": "标签",
                "type": "select",
                "options": [
                    "item.name"
                ]
            }
        ]
    },
    "标签管理": {
        "headers": [
            "编号",
            "标签名称",
            "粉丝数"
        ],
        "entityName": "标签",
        "fields": [
            {
                "label": "标签名称",
                "required": true,
                "type": "input"
            }
        ]
    },
    "数据统计": {
        "headers": [
            "编号",
            "日期",
            "新增粉丝",
            "累计粉丝",
            "消息数",
            "素材阅读量"
        ],
        "entityName": "数据统计",
        "fields": [
            {
                "label": "新增粉丝",
                "type": "input"
            },
            {
                "label": "累计粉丝",
                "type": "input"
            },
            {
                "label": "消息数",
                "type": "input"
            },
            {
                "label": "素材阅读量",
                "type": "input"
            }
        ]
    },
    "消息管理": {
        "headers": [
            "消息类型",
            "发送方",
            "用户标识",
            "内容"
        ],
        "entityName": "消息",
        "fields": [
            {
                "label": "用户",
                "required": true,
                "type": "select",
                "options": [
                    "user.nickname || user.openid"
                ]
            },
            {
                "label": "模板数据",
                "type": "textarea"
            },
            {
                "label": "跳转链接",
                "type": "input"
            },
            {
                "label": "小程序 appId",
                "type": "input"
            },
            {
                "label": "小程序页面路径",
                "type": "input"
            }
        ]
    },
    "模板消息": {
        "headers": [
            "公众号模板ID",
            "标题",
            "模板内容",
            "模板示例",
            "一级行业",
            "二级行业"
        ],
        "entityName": "模板消息",
        "fields": [
            {
                "label": "用户",
                "required": true,
                "type": "select",
                "options": [
                    "user.nickname || user.openid"
                ]
            },
            {
                "label": "模板数据",
                "type": "textarea"
            },
            {
                "label": "跳转链接",
                "type": "input"
            },
            {
                "label": "小程序 appId",
                "type": "input"
            },
            {
                "label": "小程序页面路径",
                "type": "input"
            }
        ]
    },
    "素材管理": {
        "headers": [
            "编号",
            "素材类型",
            "素材名称",
            "文件大小",
            "上传时间",
            "状态"
        ],
        "entityName": "素材",
        "fields": [
            {
                "label": "素材类型",
                "type": "input"
            },
            {
                "label": "素材名称",
                "type": "input",
                "required": true
            },
            {
                "label": "文件大小",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "发布管理": {
        "headers": [
            "编号",
            "文章标题",
            "发布媒体",
            "发布时间",
            "发布状态"
        ],
        "entityName": "发布",
        "fields": [
            {
                "label": "文章标题",
                "type": "input"
            },
            {
                "label": "发布媒体",
                "type": "input"
            },
            {
                "label": "发布状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "草稿箱": {
        "headers": [
            "编号",
            "文章标题",
            "作者",
            "分类",
            "更新时间",
            "状态"
        ],
        "entityName": "草稿箱",
        "fields": [
            {
                "label": "文章标题",
                "type": "input"
            },
            {
                "label": "作者",
                "type": "input"
            },
            {
                "label": "分类",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "自动回复": {
        "headers": [
            "回复消息类型",
            "回复内容"
        ],
        "entityName": "自动回复",
        "fields": [
            {
                "label": "消息类型",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "匹配类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "关键词",
                "required": true,
                "type": "input"
            }
        ]
    },
    "公众号管理": {
        "headers": [
            "名称",
            "微信号",
            "appId",
            "服务器地址(URL)",
            "二维码",
            "备注"
        ],
        "entityName": "公众号",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "微信号",
                "required": true,
                "type": "input"
            },
            {
                "label": "appId",
                "required": true,
                "type": "input"
            },
            {
                "label": "appSecret",
                "required": true,
                "type": "input"
            },
            {
                "label": "token",
                "required": true,
                "type": "input"
            },
            {
                "label": "消息加解密密钥",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "会员列表": {
        "headers": [
            "用户编号",
            "头像",
            "手机号",
            "昵称",
            "等级",
            "分组",
            "用户标签",
            "积分",
            "状态",
            "登录时间",
            "注册时间"
        ],
        "entityName": "会员列表",
        "fields": [
            {
                "label": "手机号",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "用户昵称",
                "type": "input"
            },
            {
                "label": "头像",
                "type": "input"
            },
            {
                "label": "真实名字",
                "type": "input"
            },
            {
                "label": "用户性别",
                "type": "radio"
            },
            {
                "label": "出生日期",
                "type": "date"
            },
            {
                "label": "所在地",
                "type": "select"
            },
            {
                "label": "用户标签",
                "type": "input"
            },
            {
                "label": "用户分组",
                "type": "input"
            },
            {
                "label": "会员备注",
                "type": "textarea"
            }
        ]
    },
    "会员详情": {
        "headers": [
            "订单编号",
            "商品信息",
            "支付金额",
            "订单状态",
            "下单时间"
        ],
        "entityName": "会员详情",
        "fields": [
            {
                "label": "手机号",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "用户昵称",
                "type": "input"
            },
            {
                "label": "头像",
                "type": "input"
            },
            {
                "label": "真实名字",
                "type": "input"
            },
            {
                "label": "用户性别",
                "type": "radio"
            },
            {
                "label": "出生日期",
                "type": "date"
            },
            {
                "label": "所在地",
                "type": "select"
            },
            {
                "label": "用户标签",
                "type": "input"
            },
            {
                "label": "用户分组",
                "type": "input"
            },
            {
                "label": "会员备注",
                "type": "textarea"
            }
        ]
    },
    "会员标签": {
        "headers": [
            "编号",
            "标签名称"
        ],
        "entityName": "会员标签",
        "fields": [
            {
                "label": "标签名称",
                "required": true,
                "type": "input"
            }
        ]
    },
    "签到记录": {
        "headers": [
            "编号",
            "签到用户",
            "签到天数",
            "获得积分",
            "签到时间"
        ],
        "entityName": "签到记录",
        "fields": [
            {
                "label": "签到用户",
                "type": "input"
            },
            {
                "label": "签到天数",
                "type": "input"
            },
            {
                "label": "获得积分",
                "type": "input"
            }
        ]
    },
    "签到配置": {
        "headers": [
            "签到天数",
            "奖励积分",
            "奖励经验",
            "状态"
        ],
        "entityName": "签到配置",
        "fields": [
            {
                "label": "签到天数",
                "required": true,
                "type": "number"
            },
            {
                "label": "奖励积分",
                "required": true,
                "type": "number"
            },
            {
                "label": "奖励经验",
                "required": true,
                "type": "number"
            },
            {
                "label": "开启状态",
                "type": "radio"
            }
        ]
    },
    "会员积分": {
        "headers": [
            "编号",
            "获得时间",
            "用户",
            "获得积分",
            "总积分",
            "标题",
            "描述",
            "业务编码",
            "业务类型"
        ],
        "entityName": "会员积分",
        "fields": [
            {
                "label": "用户",
                "type": "input"
            },
            {
                "label": "获得积分",
                "type": "input"
            },
            {
                "label": "总积分",
                "type": "input"
            },
            {
                "label": "标题",
                "type": "input"
            },
            {
                "label": "描述",
                "type": "textarea"
            },
            {
                "label": "业务编码",
                "type": "input",
                "required": true
            },
            {
                "label": "业务类型",
                "type": "input"
            }
        ]
    },
    "积分记录": {
        "headers": [
            "编号",
            "获得时间",
            "用户",
            "获得积分",
            "总积分",
            "标题",
            "描述",
            "业务编码",
            "业务类型"
        ],
        "entityName": "积分记录",
        "fields": [
            {
                "label": "用户",
                "type": "input"
            },
            {
                "label": "获得积分",
                "type": "input"
            },
            {
                "label": "总积分",
                "type": "input"
            },
            {
                "label": "标题",
                "type": "input"
            },
            {
                "label": "描述",
                "type": "textarea"
            },
            {
                "label": "业务编码",
                "type": "input",
                "required": true
            },
            {
                "label": "业务类型",
                "type": "input"
            }
        ]
    },
    "会员等级": {
        "headers": [
            "编号",
            "等级图标",
            "等级背景图",
            "等级名称",
            "等级",
            "升级经验",
            "享受折扣(%)",
            "状态"
        ],
        "entityName": "会员等级",
        "fields": [
            {
                "label": "等级名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "等级",
                "required": true,
                "type": "number"
            },
            {
                "label": "升级经验",
                "required": true,
                "type": "number"
            },
            {
                "label": "享受折扣(%)",
                "required": true,
                "type": "number"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "会员分组": {
        "headers": [
            "编号",
            "名称",
            "备注",
            "状态"
        ],
        "entityName": "会员分组",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "会员配置": {
        "headers": [],
        "entityName": "会员配置",
        "fields": [
            {
                "label": "签到天数",
                "required": true,
                "type": "number"
            },
            {
                "label": "奖励积分",
                "required": true,
                "type": "number"
            },
            {
                "label": "奖励经验",
                "required": true,
                "type": "number"
            },
            {
                "label": "开启状态",
                "type": "radio"
            }
        ]
    },
    "交易配置": {
        "headers": [],
        "entityName": "交易配置",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "交易统计": {
        "headers": [],
        "entityName": "交易统计",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "商品统计": {
        "headers": [
            "排名",
            "商品图片",
            "商品名称",
            "分类",
            "销售数量",
            "销售金额",
            "浏览量",
            "收藏数"
        ],
        "entityName": "商品统计",
        "fields": [
            {
                "label": "排名",
                "type": "input"
            },
            {
                "label": "商品图片",
                "type": "input"
            },
            {
                "label": "商品名称",
                "type": "input",
                "required": true
            },
            {
                "label": "分类",
                "type": "input"
            },
            {
                "label": "销售数量",
                "type": "input"
            },
            {
                "label": "销售金额",
                "type": "input"
            },
            {
                "label": "浏览量",
                "type": "input"
            },
            {
                "label": "收藏数",
                "type": "input"
            }
        ]
    },
    "会员统计": {
        "headers": [
            "省份",
            "会员数量",
            "订单创建数量",
            "订单支付数量",
            "订单支付金额"
        ],
        "entityName": "会员统计",
        "fields": [
            {
                "label": "省份",
                "type": "input"
            },
            {
                "label": "会员数量",
                "type": "input"
            },
            {
                "label": "订单创建数量",
                "type": "input"
            },
            {
                "label": "订单支付数量",
                "type": "input"
            },
            {
                "label": "订单支付金额",
                "type": "input"
            }
        ]
    },
    "秒杀活动": {
        "headers": [
            "编号",
            "活动名称",
            "秒杀时段",
            "秒杀价",
            "限量",
            "已售",
            "状态",
            "创建时间"
        ],
        "entityName": "秒杀活动",
        "fields": [
            {
                "label": "秒杀时段名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "开始时间点",
                "required": true,
                "type": "input"
            },
            {
                "label": "结束时间点",
                "required": true,
                "type": "input"
            },
            {
                "label": "秒杀轮播图",
                "type": "input"
            },
            {
                "label": "活动状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "秒杀时段": {
        "headers": [
            "秒杀时段名称",
            "开始时间点",
            "结束时间点",
            "秒杀轮播图",
            "活动状态",
            "创建时间"
        ],
        "entityName": "秒杀时段",
        "fields": [
            {
                "label": "秒杀时段名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "开始时间点",
                "required": true,
                "type": "input"
            },
            {
                "label": "结束时间点",
                "required": true,
                "type": "input"
            },
            {
                "label": "秒杀轮播图",
                "type": "input"
            },
            {
                "label": "活动状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "秒杀商品": {
        "headers": [
            "活动编号",
            "活动名称",
            "秒杀时段",
            "活动时间",
            "商品图片",
            "商品标题",
            "原价",
            "秒杀价",
            "活动状态",
            "库存",
            "总库存",
            "创建时间"
        ],
        "entityName": "秒杀商品",
        "fields": [
            {
                "label": "活动名称",
                "type": "input",
                "required": true
            },
            {
                "label": "秒杀时段",
                "type": "input"
            },
            {
                "label": "商品图片",
                "type": "input"
            },
            {
                "label": "商品标题",
                "type": "input"
            },
            {
                "label": "原价",
                "type": "input"
            },
            {
                "label": "秒杀价",
                "type": "input"
            },
            {
                "label": "活动状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "库存",
                "type": "input"
            },
            {
                "label": "总库存",
                "type": "input"
            }
        ]
    },
    "满减送活动": {
        "headers": [
            "活动名称",
            "活动范围",
            "活动开始时间",
            "活动结束时间",
            "状态",
            "创建时间"
        ],
        "entityName": "满减送活动",
        "fields": [
            {
                "label": "活动名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "活动时间",
                "required": true,
                "type": "date"
            },
            {
                "label": "条件类型",
                "required": true,
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            },
            {
                "label": "活动范围",
                "required": true,
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            },
            {
                "label": "分类",
                "required": true,
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            }
        ]
    },
    "积分商城": {
        "headers": [
            "编号",
            "商品名称",
            "所需积分",
            "库存",
            "已兑换",
            "状态",
            "创建时间"
        ],
        "entityName": "积分商城",
        "fields": [
            {
                "label": "商品名称",
                "type": "input",
                "required": true
            },
            {
                "label": "所需积分",
                "type": "input"
            },
            {
                "label": "库存",
                "type": "input"
            },
            {
                "label": "已兑换",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "商品管理": {
        "headers": [
            "商品编号",
            "商品信息",
            "价格",
            "销量",
            "库存",
            "排序",
            "销售状态",
            "创建时间"
        ],
        "entityName": "商品",
        "fields": [
            {
                "label": "商品信息",
                "type": "input"
            },
            {
                "label": "价格",
                "type": "input"
            },
            {
                "label": "销量",
                "type": "input"
            },
            {
                "label": "库存",
                "type": "input"
            },
            {
                "label": "排序",
                "type": "input"
            },
            {
                "label": "销售状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "商品编辑": {
        "headers": [],
        "entityName": "商品编辑",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "商品属性": {
        "headers": [
            "编号",
            "属性名称",
            "备注",
            "创建时间"
        ],
        "entityName": "商品属性",
        "fields": [
            {
                "label": "属性名称",
                "required": true,
                "type": "select",
                "options": [
                    "item.name"
                ]
            }
        ]
    },
    "商品评论": {
        "headers": [
            "评论编号",
            "商品信息",
            "用户名称",
            "商品评分",
            "服务评分",
            "评论内容",
            "回复内容",
            "评论时间",
            "是否展示"
        ],
        "entityName": "商品评论",
        "fields": [
            {
                "label": "商品",
                "required": true,
                "type": "input"
            },
            {
                "label": "商品规格",
                "required": true,
                "type": "input"
            },
            {
                "label": "用户头像",
                "required": true,
                "type": "input"
            },
            {
                "label": "用户名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "评论内容",
                "required": true,
                "type": "textarea"
            },
            {
                "label": "描述星级",
                "required": true,
                "type": "input"
            },
            {
                "label": "服务星级",
                "required": true,
                "type": "input"
            },
            {
                "label": "评论图片",
                "type": "input"
            }
        ]
    },
    "商品分类": {
        "headers": [
            "名称",
            "分类图标",
            "排序",
            "状态",
            "创建时间"
        ],
        "entityName": "商品分类",
        "fields": [
            {
                "label": "上级分类",
                "required": true,
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "分类名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "移动端分类图",
                "required": true,
                "type": "input"
            },
            {
                "label": "分类排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "商品品牌": {
        "headers": [
            "品牌名称",
            "品牌图片",
            "品牌排序",
            "开启状态",
            "创建时间"
        ],
        "entityName": "商品品牌",
        "fields": [
            {
                "label": "品牌名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "品牌图片",
                "required": true,
                "type": "input"
            },
            {
                "label": "品牌排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "品牌状态",
                "type": "radio"
            }
        ]
    },
    "自提门店": {
        "headers": [
            "编号",
            "门店 logo",
            "门店名称",
            "门店手机",
            "地址",
            "营业时间",
            "开启状态",
            "创建时间"
        ],
        "entityName": "自提门店",
        "fields": [
            {
                "label": "门店 logo",
                "type": "input"
            },
            {
                "label": "门店状态",
                "type": "radio"
            },
            {
                "label": "门店名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "门店手机",
                "type": "input"
            },
            {
                "label": "门店简介",
                "type": "textarea"
            },
            {
                "label": "门店所在地区",
                "type": "input"
            },
            {
                "label": "门店详细地址",
                "type": "input"
            },
            {
                "label": "营业开始时间",
                "type": "input"
            },
            {
                "label": "营业结束时间",
                "type": "input"
            },
            {
                "label": "经度",
                "type": "input"
            },
            {
                "label": "纬度",
                "type": "input"
            }
        ]
    },
    "自提订单": {
        "headers": [
            "订单号",
            "用户信息",
            "推荐人信息",
            "商品信息",
            "实付金额(元)",
            "核销员",
            "核销门店",
            "支付状态",
            "订单状态",
            "下单时间"
        ],
        "entityName": "自提订单",
        "fields": [
            {
                "label": "门店 logo",
                "type": "input"
            },
            {
                "label": "门店状态",
                "type": "radio"
            },
            {
                "label": "门店名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "门店手机",
                "type": "input"
            },
            {
                "label": "门店简介",
                "type": "textarea"
            },
            {
                "label": "门店所在地区",
                "type": "input"
            },
            {
                "label": "门店详细地址",
                "type": "input"
            },
            {
                "label": "营业开始时间",
                "type": "input"
            },
            {
                "label": "营业结束时间",
                "type": "input"
            },
            {
                "label": "经度",
                "type": "input"
            },
            {
                "label": "纬度",
                "type": "input"
            }
        ]
    },
    "订单管理": {
        "headers": [
            "编号",
            "订单编号",
            "用户昵称",
            "商品信息",
            "支付金额",
            "订单状态",
            "创建时间"
        ],
        "entityName": "订单",
        "fields": []
    },
    "订单详情": {
        "headers": [
            "商品名称",
            "规格",
            "单价",
            "数量",
            "小计"
        ],
        "entityName": "订单详情",
        "fields": [
            {
                "label": "商品名称",
                "type": "input",
                "required": true
            },
            {
                "label": "规格",
                "type": "input"
            },
            {
                "label": "单价",
                "type": "input"
            },
            {
                "label": "数量",
                "type": "input"
            },
            {
                "label": "小计",
                "type": "input"
            }
        ]
    },
    "客服中心": {
        "headers": [],
        "entityName": "客服中心",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "商城首页": {
        "headers": [],
        "entityName": "商城首页",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "快递公司": {
        "headers": [
            "公司编码",
            "公司名称",
            "公司 logo",
            "排序",
            "开启状态",
            "创建时间"
        ],
        "entityName": "快递公司",
        "fields": [
            {
                "label": "公司编码",
                "required": true,
                "type": "input"
            },
            {
                "label": "公司名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "公司 logo",
                "required": true,
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "运费模板": {
        "headers": [
            "编号",
            "模板名称",
            "计费方式",
            "排序",
            "创建时间"
        ],
        "entityName": "运费模板",
        "fields": [
            {
                "label": "模板名称",
                "type": "input"
            },
            {
                "label": "计费方式",
                "type": "radio"
            },
            {
                "label": "运费",
                "type": "number"
            },
            {
                "label": "包邮区域",
                "type": "number"
            },
            {
                "label": "排序",
                "type": "number"
            }
        ]
    },
    "装修模板": {
        "headers": [],
        "entityName": "装修模板",
        "fields": [
            {
                "label": "模板名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "预览图",
                "type": "input"
            }
        ]
    },
    "装修页面": {
        "headers": [
            "编号",
            "预览图",
            "页面名称",
            "备注",
            "创建时间"
        ],
        "entityName": "装修页面",
        "fields": [
            {
                "label": "页面名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            },
            {
                "label": "预览图",
                "type": "input"
            }
        ]
    },
    "限时折扣": {
        "headers": [
            "活动编号",
            "活动名称",
            "活动时间",
            "活动状态",
            "创建时间"
        ],
        "entityName": "限时折扣",
        "fields": [
            {
                "label": "活动名称",
                "type": "input",
                "required": true
            },
            {
                "label": "活动状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "优惠券管理": {
        "headers": [
            "编号",
            "优惠券名称",
            "类型",
            "面额/折扣",
            "发放数量",
            "已领取",
            "已使用",
            "状态"
        ],
        "entityName": "优惠券",
        "fields": [
            {
                "label": "优惠券名称",
                "type": "input"
            },
            {
                "label": "优惠券描述",
                "type": "textarea"
            },
            {
                "label": "优惠劵类型",
                "type": "radio"
            },
            {
                "label": "商品",
                "type": "input"
            },
            {
                "label": "分类",
                "type": "input"
            },
            {
                "label": "优惠类型",
                "type": "radio"
            },
            {
                "label": "优惠券面额",
                "type": "number"
            },
            {
                "label": "优惠券折扣",
                "type": "number"
            },
            {
                "label": "最多优惠",
                "type": "number"
            },
            {
                "label": "满多少元可以使用",
                "type": "number"
            },
            {
                "label": "领取方式",
                "type": "radio"
            },
            {
                "label": "发放数量",
                "type": "number"
            },
            {
                "label": "每人限领个数",
                "type": "number"
            },
            {
                "label": "有效期类型",
                "type": "radio"
            },
            {
                "label": "固定日期",
                "type": "date"
            },
            {
                "label": "领取日期",
                "type": "number"
            }
        ]
    },
    "优惠劵列表": {
        "headers": [
            "优惠券名称",
            "类型",
            "优惠",
            "领取方式",
            "使用时间",
            "发放数量",
            "剩余数量",
            "领取上限",
            "状态",
            "创建时间"
        ],
        "entityName": "优惠劵列表",
        "fields": [
            {
                "label": "优惠券名称",
                "type": "input"
            },
            {
                "label": "优惠券描述",
                "type": "textarea"
            },
            {
                "label": "优惠劵类型",
                "type": "radio"
            },
            {
                "label": "商品",
                "type": "input"
            },
            {
                "label": "分类",
                "type": "input"
            },
            {
                "label": "优惠类型",
                "type": "radio"
            },
            {
                "label": "优惠券面额",
                "type": "number"
            },
            {
                "label": "优惠券折扣",
                "type": "number"
            },
            {
                "label": "最多优惠",
                "type": "number"
            },
            {
                "label": "满多少元可以使用",
                "type": "number"
            },
            {
                "label": "领取方式",
                "type": "radio"
            },
            {
                "label": "发放数量",
                "type": "number"
            },
            {
                "label": "每人限领个数",
                "type": "number"
            },
            {
                "label": "有效期类型",
                "type": "radio"
            },
            {
                "label": "固定日期",
                "type": "date"
            },
            {
                "label": "领取日期",
                "type": "number"
            }
        ]
    },
    "领取记录": {
        "headers": [
            "会员昵称",
            "优惠券名称",
            "类型",
            "优惠",
            "领取方式",
            "状态",
            "领取时间",
            "使用时间"
        ],
        "entityName": "领取记录",
        "fields": [
            {
                "label": "会员昵称",
                "type": "input"
            },
            {
                "label": "优惠券名称",
                "type": "input",
                "required": true
            },
            {
                "label": "类型",
                "type": "input"
            },
            {
                "label": "优惠",
                "type": "input"
            },
            {
                "label": "领取方式",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "Banner": {
        "headers": [
            "Banner标题",
            "图片",
            "状态",
            "定位",
            "跳转地址",
            "创建时间",
            "排序",
            "描述"
        ],
        "entityName": "Banner",
        "fields": [
            {
                "label": "标题",
                "required": true,
                "type": "input"
            },
            {
                "label": "图片",
                "required": true,
                "type": "input"
            },
            {
                "label": "跳转地址",
                "required": true,
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "位置",
                "required": true,
                "type": "radio"
            },
            {
                "label": "描述",
                "type": "textarea"
            }
        ]
    },
    "文章管理": {
        "headers": [
            "ID",
            "封面",
            "标题",
            "分类",
            "浏览量",
            "作者",
            "文章简介",
            "排序",
            "状态",
            "发布时间"
        ],
        "entityName": "文章",
        "fields": [
            {
                "label": "文章标题",
                "type": "input"
            },
            {
                "label": "文章分类",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "文章作者",
                "type": "input"
            },
            {
                "label": "文章简介",
                "type": "input"
            },
            {
                "label": "文章封面",
                "type": "input"
            },
            {
                "label": "排序",
                "type": "number"
            },
            {
                "label": "状态",
                "type": "radio"
            },
            {
                "label": "是否热门",
                "type": "radio"
            },
            {
                "label": "是否轮播图",
                "type": "radio"
            },
            {
                "label": "商品关联",
                "type": "input"
            }
        ]
    },
    "拼团记录": {
        "headers": [
            "编号",
            "头像",
            "昵称",
            "开团团长",
            "开团时间",
            "拼团商品",
            "几人团",
            "参与人数",
            "参团时间",
            "结束时间",
            "拼团状态"
        ],
        "entityName": "拼团记录",
        "fields": [
            {
                "label": "头像",
                "type": "input"
            },
            {
                "label": "昵称",
                "type": "input"
            },
            {
                "label": "开团团长",
                "type": "input"
            },
            {
                "label": "拼团商品",
                "type": "input"
            },
            {
                "label": "几人团",
                "type": "input"
            },
            {
                "label": "参与人数",
                "type": "input"
            },
            {
                "label": "拼团状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "拼团商品": {
        "headers": [
            "活动编号",
            "活动名称",
            "活动时间",
            "商品图片",
            "商品标题",
            "原价",
            "拼团价",
            "开团组数",
            "成团组数",
            "购买次数",
            "活动状态",
            "创建时间"
        ],
        "entityName": "拼团商品",
        "fields": [
            {
                "label": "活动名称",
                "type": "input",
                "required": true
            },
            {
                "label": "商品图片",
                "type": "input"
            },
            {
                "label": "商品标题",
                "type": "input"
            },
            {
                "label": "原价",
                "type": "input"
            },
            {
                "label": "拼团价",
                "type": "input"
            },
            {
                "label": "开团组数",
                "type": "input"
            },
            {
                "label": "成团组数",
                "type": "input"
            },
            {
                "label": "购买次数",
                "type": "input"
            },
            {
                "label": "活动状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "佣金提现": {
        "headers": [
            "编号",
            "用户信息",
            "提现金额",
            "提现方式",
            "提现信息",
            "申请时间",
            "备注",
            "状态"
        ],
        "entityName": "佣金提现",
        "fields": [
            {
                "label": "用户信息",
                "type": "input"
            },
            {
                "label": "提现金额",
                "type": "input"
            },
            {
                "label": "提现方式",
                "type": "input"
            },
            {
                "label": "提现信息",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "分销员": {
        "headers": [
            "用户编号",
            "头像",
            "昵称",
            "推广人数",
            "推广订单数量",
            "推广订单金额",
            "已提现金额",
            "已提现次数",
            "未提现金额",
            "冻结中佣金",
            "推广资格",
            "成为推广员时间",
            "上级推广员编号",
            "推广员绑定时间"
        ],
        "entityName": "分销员",
        "fields": [
            {
                "label": "头像",
                "type": "input"
            },
            {
                "label": "昵称",
                "type": "input"
            },
            {
                "label": "推广人数",
                "type": "input"
            },
            {
                "label": "推广订单数量",
                "type": "input"
            },
            {
                "label": "推广订单金额",
                "type": "input"
            },
            {
                "label": "已提现金额",
                "type": "input"
            },
            {
                "label": "已提现次数",
                "type": "input"
            },
            {
                "label": "未提现金额",
                "type": "input"
            },
            {
                "label": "冻结中佣金",
                "type": "input"
            },
            {
                "label": "推广资格",
                "type": "input"
            }
        ]
    },
    "佣金记录": {
        "headers": [
            "编号",
            "用户编号",
            "头像",
            "昵称",
            "业务类型",
            "业务编号",
            "标题",
            "金额",
            "说明",
            "状态",
            "解冻时间",
            "创建时间"
        ],
        "entityName": "佣金记录",
        "fields": [
            {
                "label": "头像",
                "type": "input"
            },
            {
                "label": "昵称",
                "type": "input"
            },
            {
                "label": "业务类型",
                "type": "input"
            },
            {
                "label": "标题",
                "type": "input"
            },
            {
                "label": "金额",
                "type": "input"
            },
            {
                "label": "说明",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "砍价活动": {
        "headers": [
            "编号",
            "活动名称",
            "商品名称",
            "底价",
            "助力人数",
            "状态",
            "创建时间"
        ],
        "entityName": "砍价活动",
        "fields": [
            {
                "label": "活动名称",
                "type": "input",
                "required": true
            },
            {
                "label": "商品名称",
                "type": "input",
                "required": true
            },
            {
                "label": "底价",
                "type": "input"
            },
            {
                "label": "助力人数",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "砍价记录": {
        "headers": [
            "编号",
            "发起用户",
            "发起时间",
            "砍价活动",
            "最低价",
            "当前价",
            "总砍价次数",
            "剩余砍价次数",
            "砍价状态",
            "结束时间",
            "订单编号"
        ],
        "entityName": "砍价记录",
        "fields": [
            {
                "label": "发起用户",
                "type": "input"
            },
            {
                "label": "砍价活动",
                "type": "input"
            },
            {
                "label": "最低价",
                "type": "input"
            },
            {
                "label": "当前价",
                "type": "input"
            },
            {
                "label": "总砍价次数",
                "type": "input"
            },
            {
                "label": "剩余砍价次数",
                "type": "input"
            },
            {
                "label": "砍价状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "砍价商品": {
        "headers": [
            "活动编号",
            "活动名称",
            "活动时间",
            "商品图片",
            "商品标题",
            "起始价格",
            "砍价底价",
            "总砍价人数",
            "成功砍价人数",
            "助力人数",
            "活动状态",
            "库存",
            "总库存",
            "创建时间"
        ],
        "entityName": "砍价商品",
        "fields": [
            {
                "label": "活动名称",
                "type": "input",
                "required": true
            },
            {
                "label": "商品图片",
                "type": "input"
            },
            {
                "label": "商品标题",
                "type": "input"
            },
            {
                "label": "起始价格",
                "type": "input"
            },
            {
                "label": "砍价底价",
                "type": "input"
            },
            {
                "label": "总砍价人数",
                "type": "input"
            },
            {
                "label": "成功砍价人数",
                "type": "input"
            },
            {
                "label": "助力人数",
                "type": "input"
            },
            {
                "label": "活动状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "库存",
                "type": "input"
            },
            {
                "label": "总库存",
                "type": "input"
            }
        ]
    },
    "文章分类": {
        "headers": [
            "编号",
            "分类名称",
            "分类图",
            "状态",
            "排序",
            "创建时间"
        ],
        "entityName": "文章分类",
        "fields": [
            {
                "label": "分类名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "图标地址",
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "排序",
                "required": true,
                "type": "number"
            }
        ]
    },
    "售后管理": {
        "headers": [
            "编号",
            "售后编号",
            "订单编号",
            "用户昵称",
            "售后类型",
            "退款金额",
            "售后状态",
            "创建时间"
        ],
        "entityName": "售后",
        "fields": []
    },
    "售后详情": {
        "headers": [],
        "entityName": "售后详情",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "场景联动": {
        "headers": [
            "规则名称",
            "触发条件",
            "执行动作",
            "最近触发",
            "创建时间"
        ],
        "entityName": "场景联动",
        "fields": []
    },
    "数据转发": {
        "headers": [
            "规则编号",
            "规则名称",
            "规则描述",
            "规则状态",
            "数据源",
            "数据目的",
            "创建时间"
        ],
        "entityName": "数据转发",
        "fields": [
            {
                "label": "规则名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "规则描述",
                "type": "textarea"
            },
            {
                "label": "规则状态",
                "required": true,
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            },
            {
                "label": "数据目的",
                "required": true,
                "type": "select",
                "options": [
                    "sink.name"
                ]
            },
            {
                "label": "数据源",
                "required": true,
                "type": "input"
            }
        ]
    },
    "产品管理": {
        "headers": [
            "编号",
            "产品名称",
            "产品编码",
            "产品分类",
            "单位价格",
            "状态",
            "创建时间"
        ],
        "entityName": "产品",
        "fields": [
            {
                "label": "产品名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "负责人",
                "required": true,
                "type": "select",
                "options": [
                    "user.nickname"
                ]
            },
            {
                "label": "产品类型",
                "required": true,
                "type": "input"
            },
            {
                "label": "产品单位",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "产品编码",
                "required": true,
                "type": "input"
            },
            {
                "label": "价格",
                "required": true,
                "type": "number"
            },
            {
                "label": "产品描述",
                "type": "input"
            },
            {
                "label": "上架状态",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            }
        ]
    },
    "产品详情": {
        "headers": [
            "标识",
            "名称",
            "类型",
            "读写",
            "描述"
        ],
        "entityName": "产品详情",
        "fields": [
            {
                "label": "ProductKey",
                "required": true,
                "type": "input"
            },
            {
                "label": "产品名称",
                "type": "input"
            },
            {
                "label": "产品分类",
                "type": "select",
                "options": [
                    "category.name"
                ]
            },
            {
                "label": "设备类型",
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            },
            {
                "label": "联网方式",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "数据格式",
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            },
            {
                "label": "动态注册",
                "type": "input"
            },
            {
                "label": "产品图标",
                "type": "input"
            },
            {
                "label": "产品图片",
                "type": "input"
            },
            {
                "label": "产品描述",
                "type": "textarea"
            }
        ]
    },
    "固件管理": {
        "headers": [
            "编号",
            "固件名称",
            "所属产品",
            "版本号",
            "文件大小",
            "升级方式",
            "状态",
            "创建时间"
        ],
        "entityName": "固件",
        "fields": [
            {
                "label": "固件名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "固件描述",
                "type": "textarea"
            },
            {
                "label": "所属产品",
                "required": true,
                "type": "select",
                "options": [
                    "product.name"
                ]
            },
            {
                "label": "版本号",
                "required": true,
                "type": "input"
            },
            {
                "label": "固件文件",
                "required": true,
                "type": "input"
            }
        ]
    },
    "IoT 首页": {
        "headers": [],
        "entityName": "IoT 首页",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "设备管理": {
        "headers": [
            "编号",
            "设备名称",
            "设备编号",
            "所属产品",
            "固件版本",
            "最后在线",
            "设备状态"
        ],
        "entityName": "设备",
        "fields": [
            {
                "label": "产品",
                "required": true,
                "type": "select",
                "options": [
                    "product.name"
                ]
            },
            {
                "label": "DeviceName",
                "required": true,
                "type": "input"
            },
            {
                "label": "备注名称",
                "type": "input"
            },
            {
                "label": "设备图片",
                "type": "input"
            },
            {
                "label": "设备分组",
                "type": "select",
                "options": [
                    "group.name"
                ]
            },
            {
                "label": "设备序列号",
                "type": "input"
            },
            {
                "label": "设备位置",
                "type": "input"
            }
        ]
    },
    "物模型": {
        "headers": [
            "功能类型",
            "功能名称",
            "标识符",
            "数据类型",
            "数据定义"
        ],
        "entityName": "物模型",
        "fields": [
            {
                "label": "功能类型",
                "type": "radio"
            },
            {
                "label": "功能名称",
                "type": "input"
            },
            {
                "label": "标识符",
                "type": "input"
            },
            {
                "label": "描述",
                "type": "textarea"
            }
        ]
    },
    "产品分类": {
        "headers": [
            "分类编号",
            "分类名称",
            "创建时间"
        ],
        "entityName": "产品分类",
        "fields": [
            {
                "label": "父级分类",
                "required": true,
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "名称",
                "required": true,
                "type": "input"
            }
        ]
    },
    "设备分组": {
        "headers": [
            "分组 ID",
            "分组名字",
            "分组状态",
            "分组描述",
            "创建时间",
            "设备数量"
        ],
        "entityName": "设备分组",
        "fields": [
            {
                "label": "分组名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "分组状态",
                "required": true,
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            },
            {
                "label": "分组描述",
                "type": "textarea"
            }
        ]
    },
    "设备详情": {
        "headers": [
            "属性标识",
            "属性名称",
            "当前值",
            "更新时间",
            "事件时间",
            "事件类型",
            "事件内容"
        ],
        "entityName": "设备详情",
        "fields": [
            {
                "label": "产品",
                "required": true,
                "type": "select",
                "options": [
                    "product.name"
                ]
            },
            {
                "label": "DeviceName",
                "required": true,
                "type": "input"
            },
            {
                "label": "备注名称",
                "type": "input"
            },
            {
                "label": "设备图片",
                "type": "input"
            },
            {
                "label": "设备分组",
                "type": "select",
                "options": [
                    "group.name"
                ]
            },
            {
                "label": "设备序列号",
                "type": "input"
            },
            {
                "label": "设备位置",
                "type": "input"
            }
        ]
    },
    "告警记录": {
        "headers": [
            "记录编号",
            "告警名称",
            "告警级别",
            "产品名称",
            "设备名称",
            "触发的设备消息",
            "是否处理",
            "处理结果",
            "创建时间"
        ],
        "entityName": "告警记录",
        "fields": [
            {
                "label": "告警名称",
                "type": "input",
                "required": true
            },
            {
                "label": "告警级别",
                "type": "input"
            },
            {
                "label": "产品名称",
                "type": "input",
                "required": true
            },
            {
                "label": "设备名称",
                "type": "input",
                "required": true
            },
            {
                "label": "触发的设备消息",
                "type": "input"
            },
            {
                "label": "是否处理",
                "type": "input"
            },
            {
                "label": "处理结果",
                "type": "input"
            }
        ]
    },
    "告警配置": {
        "headers": [
            "配置编号",
            "配置名称",
            "配置描述",
            "告警级别",
            "配置状态",
            "关联场景联动规则",
            "接收人",
            "接收类型",
            "创建时间"
        ],
        "entityName": "告警配置",
        "fields": [
            {
                "label": "配置名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "配置描述",
                "type": "input"
            },
            {
                "label": "告警级别",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "配置状态",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "关联场景联动规则",
                "required": true,
                "type": "select",
                "options": [
                    "scene.name"
                ]
            },
            {
                "label": "接收的用户",
                "required": true,
                "type": "select",
                "options": [
                    "user.nickname"
                ]
            },
            {
                "label": "接收类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            }
        ]
    },
    "WebSocket": {
        "headers": [],
        "entityName": "WebSocket",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "接口测试": {
        "headers": [
            "编号",
            "接口名称",
            "请求方法",
            "请求路径",
            "响应状态",
            "响应耗时"
        ],
        "entityName": "接口测试",
        "fields": [
            {
                "label": "接口名称",
                "type": "input",
                "required": true
            },
            {
                "label": "请求方法",
                "type": "input"
            },
            {
                "label": "请求路径",
                "type": "input"
            },
            {
                "label": "响应状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "响应耗时",
                "type": "input"
            }
        ]
    },
    "API 接口": {
        "headers": [],
        "entityName": "API 接口",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "链路追踪": {
        "headers": [],
        "entityName": "链路追踪",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "Redis 监控": {
        "headers": [],
        "entityName": "Redis 监控",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "MySQL 监控": {
        "headers": [],
        "entityName": "MySQL 监控",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "Java 监控": {
        "headers": [],
        "entityName": "Java 监控",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "API 日志": {
        "headers": [
            "编号",
            "请求路径",
            "请求方法",
            "用户ID",
            "请求耗时",
            "请求状态",
            "请求时间"
        ],
        "entityName": "API 日志",
        "fields": [
            {
                "label": "请求路径",
                "type": "input"
            },
            {
                "label": "请求方法",
                "type": "input"
            },
            {
                "label": "请求耗时",
                "type": "input"
            },
            {
                "label": "请求状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "定时任务": {
        "headers": [
            "编号",
            "任务名称",
            "处理器的全限定名",
            "Cron 表达式",
            "状态"
        ],
        "entityName": "定时任务",
        "fields": [
            {
                "label": "任务名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "处理器的名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "处理器的参数",
                "type": "input"
            },
            {
                "label": "CRON 表达式",
                "required": true,
                "type": "input"
            },
            {
                "label": "重试次数",
                "required": true,
                "type": "input"
            },
            {
                "label": "重试间隔",
                "required": true,
                "type": "input"
            },
            {
                "label": "监控超时时间",
                "type": "input"
            }
        ]
    },
    "任务日志": {
        "headers": [
            "编号",
            "任务名称",
            "执行时间",
            "执行耗时",
            "执行状态"
        ],
        "entityName": "任务日志",
        "fields": [
            {
                "label": "任务名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "处理器的名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "处理器的参数",
                "type": "input"
            },
            {
                "label": "CRON 表达式",
                "required": true,
                "type": "input"
            },
            {
                "label": "重试次数",
                "required": true,
                "type": "input"
            },
            {
                "label": "重试间隔",
                "required": true,
                "type": "input"
            },
            {
                "label": "监控超时时间",
                "type": "input"
            }
        ]
    },
    "文件管理": {
        "headers": [
            "文件名",
            "文件路径",
            "URL",
            "文件大小",
            "文件类型",
            "文件内容",
            "上传时间"
        ],
        "entityName": "文件",
        "fields": [
            {
                "label": "配置名",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            },
            {
                "label": "存储器",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "连接模式",
                "type": "radio"
            },
            {
                "label": "节点地址",
                "type": "input"
            },
            {
                "label": "存储 bucket",
                "type": "input"
            },
            {
                "label": "accessKey",
                "type": "input"
            },
            {
                "label": "accessSecret",
                "type": "input"
            },
            {
                "label": "是否 Path Style",
                "type": "radio"
            },
            {
                "label": "公开访问",
                "type": "radio"
            },
            {
                "label": "自定义域名",
                "type": "input"
            }
        ]
    },
    "文件配置": {
        "headers": [
            "编号",
            "配置名",
            "存储器",
            "备注",
            "主配置",
            "创建时间"
        ],
        "entityName": "文件配置",
        "fields": [
            {
                "label": "配置名",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            },
            {
                "label": "存储器",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "连接模式",
                "type": "radio"
            },
            {
                "label": "节点地址",
                "type": "input"
            },
            {
                "label": "存储 bucket",
                "type": "input"
            },
            {
                "label": "accessKey",
                "type": "input"
            },
            {
                "label": "accessSecret",
                "type": "input"
            },
            {
                "label": "是否 Path Style",
                "type": "radio"
            },
            {
                "label": "公开访问",
                "type": "radio"
            },
            {
                "label": "自定义域名",
                "type": "input"
            }
        ]
    },
    "主子表（标准）": {
        "headers": [
            "编号",
            "名字",
            "性别",
            "出生日期",
            "简介",
            "创建时间"
        ],
        "entityName": "主子表（标准）",
        "fields": [
            {
                "label": "名字",
                "type": "input"
            },
            {
                "label": "性别",
                "type": "input"
            },
            {
                "label": "简介",
                "type": "input"
            }
        ]
    },
    "主子表（内嵌）": {
        "headers": [
            "编号",
            "名字",
            "性别",
            "出生日期",
            "简介",
            "创建时间",
            "课程编号",
            "课程名称",
            "授课老师",
            "学分",
            "创建时间"
        ],
        "entityName": "主子表（内嵌）",
        "fields": [
            {
                "label": "名字",
                "type": "input"
            },
            {
                "label": "性别",
                "type": "input"
            },
            {
                "label": "简介",
                "type": "input"
            },
            {
                "label": "课程名称",
                "type": "input",
                "required": true
            },
            {
                "label": "授课老师",
                "type": "input"
            },
            {
                "label": "学分",
                "type": "input"
            }
        ]
    },
    "主子表（ERP）": {
        "headers": [
            "编号",
            "名字",
            "性别",
            "出生日期",
            "简介",
            "创建时间",
            "课程编号",
            "课程名称",
            "授课老师",
            "学分",
            "创建时间"
        ],
        "entityName": "主子表（ERP）",
        "fields": [
            {
                "label": "名字",
                "type": "input"
            },
            {
                "label": "性别",
                "type": "input"
            },
            {
                "label": "简介",
                "type": "input"
            },
            {
                "label": "课程名称",
                "type": "input",
                "required": true
            },
            {
                "label": "授课老师",
                "type": "input"
            },
            {
                "label": "学分",
                "type": "input"
            }
        ]
    },
    "树表（增删改查）": {
        "headers": [
            "编号",
            "名字",
            "创建时间"
        ],
        "entityName": "树表（增删改查）",
        "fields": [
            {
                "label": "名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "父级编号",
                "required": true,
                "type": "select"
            }
        ]
    },
    "单表（增删改查）": {
        "headers": [
            "编号",
            "名字",
            "性别",
            "出生年",
            "简介",
            "头像",
            "创建时间"
        ],
        "entityName": "单表（增删改查）",
        "fields": [
            {
                "label": "名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "性别",
                "required": true,
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            },
            {
                "label": "出生年",
                "required": true,
                "type": "date"
            },
            {
                "label": "简介",
                "required": true,
                "type": "input"
            },
            {
                "label": "头像",
                "type": "input"
            }
        ]
    },
    "数据源配置": {
        "headers": [
            "主键编号",
            "数据源名称",
            "数据源连接",
            "用户名",
            "创建时间"
        ],
        "entityName": "数据源配置",
        "fields": [
            {
                "label": "数据源名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "数据源连接",
                "required": true,
                "type": "input"
            },
            {
                "label": "用户名",
                "required": true,
                "type": "input"
            },
            {
                "label": "密码",
                "required": true,
                "type": "input"
            }
        ]
    },
    "参数配置": {
        "headers": [
            "参数主键",
            "参数分类",
            "参数名称",
            "参数键名",
            "参数键值",
            "是否可见",
            "系统内置",
            "备注",
            "创建时间"
        ],
        "entityName": "参数配置",
        "fields": [
            {
                "label": "参数分类",
                "required": true,
                "type": "input"
            },
            {
                "label": "参数名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "参数键名",
                "required": true,
                "type": "input"
            },
            {
                "label": "参数键值",
                "required": true,
                "type": "input"
            },
            {
                "label": "是否可见",
                "required": true,
                "type": "radio"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "代码生成": {
        "headers": [
            "数据源",
            "表名称",
            "表描述",
            "实体",
            "创建时间",
            "更新时间"
        ],
        "entityName": "代码生成",
        "fields": [
            {
                "label": "数据源",
                "type": "input"
            },
            {
                "label": "表名称",
                "type": "input",
                "required": true
            },
            {
                "label": "表描述",
                "type": "textarea"
            },
            {
                "label": "实体",
                "type": "input"
            }
        ]
    },
    "代码生成-编辑": {
        "headers": [
            "序号",
            "字段名",
            "字段类型",
            "字段描述",
            "物理类型",
            "必填",
            "插入",
            "编辑",
            "列表",
            "查询",
            "显示类型"
        ],
        "entityName": "代码生成-编辑",
        "fields": [
            {
                "label": "序号",
                "type": "input"
            },
            {
                "label": "字段名",
                "type": "input"
            },
            {
                "label": "字段类型",
                "type": "input"
            },
            {
                "label": "字段描述",
                "type": "textarea"
            },
            {
                "label": "物理类型",
                "type": "input"
            },
            {
                "label": "必填",
                "type": "input"
            },
            {
                "label": "插入",
                "type": "input"
            },
            {
                "label": "编辑",
                "type": "input"
            },
            {
                "label": "列表",
                "type": "input"
            },
            {
                "label": "查询",
                "type": "input"
            },
            {
                "label": "显示类型",
                "type": "input"
            }
        ]
    },
    "表单构建": {
        "headers": [],
        "entityName": "表单构建",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "API 错误日志": {
        "headers": [
            "日志编号",
            "用户编号",
            "用户类型",
            "应用名",
            "请求方法",
            "请求地址",
            "异常发生时间",
            "异常名",
            "处理状态"
        ],
        "entityName": "API 错误日志",
        "fields": [
            {
                "label": "用户类型",
                "type": "input"
            },
            {
                "label": "应用名",
                "type": "input"
            },
            {
                "label": "请求方法",
                "type": "input"
            },
            {
                "label": "请求地址",
                "type": "input"
            },
            {
                "label": "异常名",
                "type": "input"
            },
            {
                "label": "处理状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "API 访问日志": {
        "headers": [
            "日志编号",
            "用户编号",
            "用户类型",
            "应用名",
            "请求方法",
            "请求地址",
            "请求时间",
            "执行时长",
            "操作结果",
            "操作模块",
            "操作名",
            "操作类型"
        ],
        "entityName": "API 访问日志",
        "fields": [
            {
                "label": "用户类型",
                "type": "input"
            },
            {
                "label": "应用名",
                "type": "input"
            },
            {
                "label": "请求方法",
                "type": "input"
            },
            {
                "label": "请求地址",
                "type": "input"
            },
            {
                "label": "执行时长",
                "type": "input"
            },
            {
                "label": "操作结果",
                "type": "input"
            },
            {
                "label": "操作模块",
                "type": "input"
            },
            {
                "label": "操作名",
                "type": "input"
            },
            {
                "label": "操作类型",
                "type": "input"
            }
        ]
    },
    "500 服务器错误": {
        "headers": [],
        "entityName": "500 服务器错误",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "404 页面不存在": {
        "headers": [],
        "entityName": "404 页面不存在",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "403 无权限": {
        "headers": [],
        "entityName": "403 无权限",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "仓库管理": {
        "headers": [
            "编号",
            "仓库名称",
            "负责人",
            "地址",
            "状态"
        ],
        "entityName": "仓库",
        "fields": [
            {
                "label": "仓库名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "仓库地址",
                "type": "input"
            },
            {
                "label": "仓库状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "仓储费",
                "type": "number"
            },
            {
                "label": "搬运费",
                "type": "number"
            },
            {
                "label": "负责人",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "供应商管理": {
        "headers": [
            "编号",
            "供应商名称",
            "联系人",
            "电话",
            "状态",
            "创建时间"
        ],
        "entityName": "供应商",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "联系人",
                "type": "input"
            },
            {
                "label": "手机号码",
                "type": "input"
            },
            {
                "label": "联系电话",
                "type": "input"
            },
            {
                "label": "电子邮箱",
                "type": "input"
            },
            {
                "label": "传真",
                "type": "input"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "纳税人识别号",
                "type": "input"
            },
            {
                "label": "税率(%)",
                "type": "number"
            },
            {
                "label": "开户行",
                "type": "input"
            },
            {
                "label": "开户账号",
                "type": "input"
            },
            {
                "label": "开户地址",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "库存查询": {
        "headers": [
            "编号",
            "产品名称",
            "仓库",
            "库存数量",
            "预警数量",
            "状态"
        ],
        "entityName": "库存查询",
        "fields": [
            {
                "label": "出库单号",
                "type": "input"
            },
            {
                "label": "出库时间",
                "required": true,
                "type": "date"
            },
            {
                "label": "客户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            }
        ]
    },
    "库存流水": {
        "headers": [
            "编号",
            "产品名称",
            "仓库",
            "业务类型",
            "数量",
            "创建时间"
        ],
        "entityName": "库存流水",
        "fields": [
            {
                "label": "产品名称",
                "type": "input",
                "required": true
            },
            {
                "label": "仓库",
                "type": "input"
            },
            {
                "label": "业务类型",
                "type": "input"
            },
            {
                "label": "数量",
                "type": "input"
            }
        ]
    },
    "其他出库": {
        "headers": [
            "编号",
            "出库单号",
            "仓库",
            "产品",
            "出库数量",
            "创建时间"
        ],
        "entityName": "其他出库",
        "fields": [
            {
                "label": "出库单号",
                "type": "input"
            },
            {
                "label": "出库时间",
                "required": true,
                "type": "date"
            },
            {
                "label": "客户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            }
        ]
    },
    "库存调拨": {
        "headers": [
            "编号",
            "调拨单号",
            "调出仓库",
            "调入仓库",
            "状态",
            "创建时间"
        ],
        "entityName": "库存调拨",
        "fields": [
            {
                "label": "调度单号",
                "type": "input"
            },
            {
                "label": "调度时间",
                "required": true,
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            }
        ]
    },
    "其他入库": {
        "headers": [
            "编号",
            "入库单号",
            "仓库",
            "产品",
            "入库数量",
            "创建时间"
        ],
        "entityName": "其他入库",
        "fields": [
            {
                "label": "入库单号",
                "type": "input"
            },
            {
                "label": "入库时间",
                "required": true,
                "type": "date"
            },
            {
                "label": "供应商",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            }
        ]
    },
    "库存盘点": {
        "headers": [
            "编号",
            "盘点单号",
            "仓库",
            "盘点类型",
            "盘点状态",
            "盘点时间",
            "差异数量"
        ],
        "entityName": "库存盘点",
        "fields": [
            {
                "label": "盘点单号",
                "type": "input"
            },
            {
                "label": "盘点时间",
                "required": true,
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            }
        ]
    },
    "销售退货": {
        "headers": [
            "编号",
            "退货单号",
            "销售单号",
            "客户",
            "退货数量",
            "退货时间",
            "状态"
        ],
        "entityName": "销售退货",
        "fields": [
            {
                "label": "退货单号",
                "type": "input"
            },
            {
                "label": "退货时间",
                "type": "date"
            },
            {
                "label": "关联订单",
                "type": "input"
            },
            {
                "label": "客户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "销售人员",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "优惠率（%）",
                "type": "number"
            },
            {
                "label": "退款优惠",
                "type": "input"
            },
            {
                "label": "其它费用",
                "type": "number"
            },
            {
                "label": "结算账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "应退金额",
                "type": "input"
            }
        ]
    },
    "销售出库": {
        "headers": [
            "编号",
            "出库单号",
            "销售单号",
            "客户",
            "出库数量",
            "出库时间",
            "状态"
        ],
        "entityName": "销售出库",
        "fields": [
            {
                "label": "出库单号",
                "type": "input"
            },
            {
                "label": "出库时间",
                "type": "date"
            },
            {
                "label": "关联订单",
                "type": "input"
            },
            {
                "label": "客户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "销售人员",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "优惠率（%）",
                "type": "number"
            },
            {
                "label": "收款优惠",
                "type": "input"
            },
            {
                "label": "其它费用",
                "type": "number"
            },
            {
                "label": "结算账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            }
        ]
    },
    "销售订单": {
        "headers": [
            "编号",
            "销售单号",
            "客户",
            "合计金额",
            "销售状态",
            "下单时间"
        ],
        "entityName": "销售订单",
        "fields": [
            {
                "label": "订单单号",
                "type": "input"
            },
            {
                "label": "订单时间",
                "type": "date"
            },
            {
                "label": "客户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "销售人员",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "优惠率（%）",
                "type": "number"
            },
            {
                "label": "收款优惠",
                "type": "input"
            },
            {
                "label": "结算账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "收取订金",
                "type": "number"
            }
        ]
    },
    "客户管理": {
        "headers": [
            "客户名称",
            "客户来源",
            "手机",
            "电话",
            "邮箱",
            "客户级别",
            "客户行业",
            "下次联系时间",
            "备注",
            "锁定状态",
            "成交状态",
            "最后跟进时间",
            "最后跟进记录",
            "地址",
            "距离进入公海天数",
            "负责人",
            "所属部门",
            "更新时间",
            "创建时间",
            "创建人"
        ],
        "entityName": "客户",
        "fields": [
            {
                "label": "客户名称",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "客户行业",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "客户级别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "供应商": {
        "headers": [
            "编号",
            "供应商名称",
            "联系人",
            "联系电话",
            "状态",
            "结算账户",
            "创建时间"
        ],
        "entityName": "供应商",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "联系人",
                "type": "input"
            },
            {
                "label": "手机号码",
                "type": "input"
            },
            {
                "label": "联系电话",
                "type": "input"
            },
            {
                "label": "电子邮箱",
                "type": "input"
            },
            {
                "label": "传真",
                "type": "input"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "纳税人识别号",
                "type": "input"
            },
            {
                "label": "税率(%)",
                "type": "number"
            },
            {
                "label": "开户行",
                "type": "input"
            },
            {
                "label": "开户账号",
                "type": "input"
            },
            {
                "label": "开户地址",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "采购退货": {
        "headers": [
            "编号",
            "退货单号",
            "采购订单",
            "供应商",
            "退货数量",
            "创建时间"
        ],
        "entityName": "采购退货",
        "fields": [
            {
                "label": "退货单号",
                "type": "input"
            },
            {
                "label": "退货时间",
                "type": "date"
            },
            {
                "label": "关联订单",
                "type": "input"
            },
            {
                "label": "供应商",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "优惠率（%）",
                "type": "number"
            },
            {
                "label": "退款优惠",
                "type": "input"
            },
            {
                "label": "其它费用",
                "type": "number"
            },
            {
                "label": "结算账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "应退金额",
                "type": "input"
            }
        ]
    },
    "采购订单": {
        "headers": [
            "编号",
            "订单编号",
            "供应商",
            "金额",
            "状态",
            "创建时间"
        ],
        "entityName": "采购订单",
        "fields": [
            {
                "label": "订单单号",
                "type": "input"
            },
            {
                "label": "订单时间",
                "type": "date"
            },
            {
                "label": "供应商",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "优惠率（%）",
                "type": "number"
            },
            {
                "label": "付款优惠",
                "type": "input"
            },
            {
                "label": "结算账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "支付订金",
                "type": "number"
            }
        ]
    },
    "采购入库": {
        "headers": [
            "编号",
            "入库单号",
            "采购订单",
            "供应商",
            "入库数量",
            "创建时间"
        ],
        "entityName": "采购入库",
        "fields": [
            {
                "label": "入库单号",
                "type": "input"
            },
            {
                "label": "入库时间",
                "type": "date"
            },
            {
                "label": "关联订单",
                "type": "input"
            },
            {
                "label": "供应商",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "优惠率（%）",
                "type": "number"
            },
            {
                "label": "付款优惠",
                "type": "input"
            },
            {
                "label": "其它费用",
                "type": "number"
            },
            {
                "label": "结算账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            }
        ]
    },
    "计量单位": {
        "headers": [
            "编号",
            "单位名称",
            "状态"
        ],
        "entityName": "计量单位",
        "fields": [
            {
                "label": "单位名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "单位状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "ERP首页": {
        "headers": [],
        "entityName": "ERP首页",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "收款管理": {
        "headers": [
            "编号",
            "收款单号",
            "客户",
            "收款金额",
            "收款账户",
            "收款日期",
            "状态"
        ],
        "entityName": "收款",
        "fields": [
            {
                "label": "收款单号",
                "type": "input"
            },
            {
                "label": "收款时间",
                "type": "date"
            },
            {
                "label": "客户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "财务人员",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "收款账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "合计收款",
                "type": "input"
            },
            {
                "label": "优惠金额",
                "type": "number"
            }
        ]
    },
    "付款管理": {
        "headers": [
            "编号",
            "付款单号",
            "供应商",
            "付款金额",
            "付款账户",
            "付款日期",
            "状态"
        ],
        "entityName": "付款",
        "fields": [
            {
                "label": "付款单号",
                "type": "input"
            },
            {
                "label": "付款时间",
                "type": "date"
            },
            {
                "label": "供应商",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "财务人员",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "附件",
                "type": "input"
            },
            {
                "label": "付款账户",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "合计付款",
                "type": "input"
            },
            {
                "label": "优惠金额",
                "type": "number"
            }
        ]
    },
    "财务账户": {
        "headers": [
            "编号",
            "账户名称",
            "账户编号",
            "收入金额",
            "支出金额",
            "余额",
            "状态"
        ],
        "entityName": "财务账户",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "备注",
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            }
        ]
    },
    "CRM 统计": {
        "headers": [
            "排名",
            "销售员",
            "合同金额",
            "回款金额",
            "客户数"
        ],
        "entityName": "CRM 统计",
        "fields": [
            {
                "label": "排名",
                "type": "input"
            },
            {
                "label": "销售员",
                "type": "input"
            },
            {
                "label": "合同金额",
                "type": "input"
            },
            {
                "label": "回款金额",
                "type": "input"
            },
            {
                "label": "客户数",
                "type": "input"
            }
        ]
    },
    "排行榜统计": {
        "headers": [
            "排名",
            "员工姓名",
            "部门",
            "合同金额（元）",
            "合同数量",
            "占比"
        ],
        "entityName": "排行榜统计",
        "fields": [
            {
                "label": "排名",
                "type": "input"
            },
            {
                "label": "员工姓名",
                "type": "input"
            },
            {
                "label": "部门",
                "type": "input"
            },
            {
                "label": "合同金额（元）",
                "type": "input"
            },
            {
                "label": "合同数量",
                "type": "input"
            },
            {
                "label": "占比",
                "type": "input"
            }
        ]
    },
    "客户画像分析": {
        "headers": [],
        "entityName": "客户画像分析",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "员工业绩分析": {
        "headers": [],
        "entityName": "员工业绩分析",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "销售漏斗": {
        "headers": [],
        "entityName": "销售漏斗",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "回款管理": {
        "headers": [
            "编号",
            "回款编号",
            "客户名称",
            "合同编号",
            "回款金额",
            "回款日期",
            "回款方式",
            "回款状态"
        ],
        "entityName": "回款",
        "fields": [
            {
                "label": "回款编号",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "合同名称",
                "type": "select",
                "options": [
                    "data.name"
                ]
            },
            {
                "label": "回款期数",
                "type": "select",
                "options": [
                    "'第 ' + data.period + ' 期'"
                ]
            },
            {
                "label": "回款方式",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "回款金额",
                "type": "number"
            },
            {
                "label": "回款日期",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "回款计划": {
        "headers": [
            "编号",
            "计划编号",
            "客户名称",
            "合同编号",
            "计划回款金额",
            "计划回款日期",
            "实际回款日期",
            "状态"
        ],
        "entityName": "回款计划",
        "fields": [
            {
                "label": "还款期数",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "合同名称",
                "type": "select",
                "options": [
                    "data.name"
                ]
            },
            {
                "label": "计划回款金额",
                "type": "number"
            },
            {
                "label": "计划回款日期",
                "type": "date"
            },
            {
                "label": "提前几天提醒",
                "type": "number"
            },
            {
                "label": "回款方式",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "客户公海": {
        "headers": [
            "客户名称",
            "客户来源",
            "手机",
            "电话",
            "邮箱",
            "客户级别",
            "客户行业",
            "下次联系时间",
            "成交状态",
            "最后跟进时间",
            "创建人"
        ],
        "entityName": "客户公海",
        "fields": [
            {
                "label": "客户名称",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "客户行业",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "客户级别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "客户详情": {
        "headers": [
            "商机名称",
            "商机金额",
            "阶段",
            "负责人",
            "创建时间"
        ],
        "entityName": "客户详情",
        "fields": [
            {
                "label": "客户名称",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "客户行业",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "客户级别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "合同管理": {
        "headers": [
            "编号",
            "合同编号",
            "合同名称",
            "客户名称",
            "合同金额",
            "开始日期",
            "结束日期",
            "合同状态"
        ],
        "entityName": "合同",
        "fields": [
            {
                "label": "合同编号",
                "type": "input"
            },
            {
                "label": "合同名称",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "商机名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "下单日期",
                "type": "date"
            },
            {
                "label": "开始时间",
                "type": "date"
            },
            {
                "label": "结束时间",
                "type": "date"
            },
            {
                "label": "公司签约人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户签约人",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "产品总金额",
                "type": "input"
            },
            {
                "label": "整单折扣（%）",
                "type": "number"
            },
            {
                "label": "折扣后金额",
                "type": "input"
            }
        ]
    },
    "合同详情": {
        "headers": [],
        "entityName": "合同详情",
        "fields": [
            {
                "label": "合同编号",
                "type": "input"
            },
            {
                "label": "合同名称",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "商机名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "下单日期",
                "type": "date"
            },
            {
                "label": "开始时间",
                "type": "date"
            },
            {
                "label": "结束时间",
                "type": "date"
            },
            {
                "label": "公司签约人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户签约人",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "产品总金额",
                "type": "input"
            },
            {
                "label": "整单折扣（%）",
                "type": "number"
            },
            {
                "label": "折扣后金额",
                "type": "input"
            }
        ]
    },
    "联系人管理": {
        "headers": [
            "联系人姓名",
            "客户名称",
            "手机",
            "电话",
            "邮箱",
            "职位",
            "地址",
            "关键决策人",
            "直属上级",
            "地址",
            "下次联系时间",
            "性别",
            "备注",
            "最后跟进时间",
            "负责人",
            "所属部门",
            "更新时间",
            "创建时间",
            "创建人"
        ],
        "entityName": "联系人",
        "fields": [
            {
                "label": "联系人姓名",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "职位",
                "type": "input"
            },
            {
                "label": "关键决策人",
                "type": "radio"
            },
            {
                "label": "性别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "直属上级",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "公海客户配置": {
        "headers": [],
        "entityName": "公海客户配置",
        "fields": [
            {
                "label": "客户名称",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "客户行业",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "客户级别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "客户限制配置": {
        "headers": [
            "编号",
            "规则适用人群",
            "规则适用部门",
            "拥有客户数上限",
            "成交客户是否占用拥有客户数",
            "创建时间",
            "编号",
            "规则适用人群",
            "规则适用部门",
            "锁定客户数上限",
            "创建时间"
        ],
        "entityName": "客户限制配置",
        "fields": [
            {
                "label": "客户名称",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "客户行业",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "客户级别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "合同配置": {
        "headers": [],
        "entityName": "合同配置",
        "fields": [
            {
                "label": "合同编号",
                "type": "input"
            },
            {
                "label": "合同名称",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "商机名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "下单日期",
                "type": "date"
            },
            {
                "label": "开始时间",
                "type": "date"
            },
            {
                "label": "结束时间",
                "type": "date"
            },
            {
                "label": "公司签约人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户签约人",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "产品总金额",
                "type": "input"
            },
            {
                "label": "整单折扣（%）",
                "type": "number"
            },
            {
                "label": "折扣后金额",
                "type": "input"
            }
        ]
    },
    "商机状态配置": {
        "headers": [
            "状态组名",
            "应用部门",
            "创建人",
            "创建时间"
        ],
        "entityName": "商机状态配置",
        "fields": [
            {
                "label": "商机名称",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "商机状态组",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "预计成交日期",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "产品总金额",
                "type": "input"
            },
            {
                "label": "整单折扣（%）",
                "type": "number"
            },
            {
                "label": "折扣后金额",
                "type": "input"
            }
        ]
    },
    "线索管理": {
        "headers": [
            "线索名称",
            "线索来源",
            "手机",
            "电话",
            "邮箱",
            "地址",
            "客户行业",
            "客户级别",
            "下次联系时间",
            "备注",
            "最后跟进时间",
            "最后跟进记录",
            "负责人",
            "所属部门",
            "更新时间",
            "创建时间",
            "创建人"
        ],
        "entityName": "线索",
        "fields": [
            {
                "label": "线索名称",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "客户行业",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "客户级别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "线索详情": {
        "headers": [],
        "entityName": "线索详情",
        "fields": [
            {
                "label": "线索名称",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "手机",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "电话",
                "type": "input"
            },
            {
                "label": "邮箱",
                "type": "input"
            },
            {
                "label": "微信",
                "type": "input"
            },
            {
                "label": "QQ",
                "type": "input"
            },
            {
                "label": "客户行业",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "客户级别",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "地址",
                "type": "input"
            },
            {
                "label": "详细地址",
                "type": "input"
            },
            {
                "label": "下次联系时间",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "商机管理": {
        "headers": [
            "商机名称",
            "客户名称",
            "商机金额（元）",
            "预计成交日期",
            "备注",
            "下次联系时间",
            "负责人",
            "所属部门",
            "最后跟进时间",
            "更新时间",
            "创建时间",
            "创建人",
            "商机状态组",
            "商机阶段"
        ],
        "entityName": "商机",
        "fields": [
            {
                "label": "商机名称",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "商机状态组",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "预计成交日期",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "产品总金额",
                "type": "input"
            },
            {
                "label": "整单折扣（%）",
                "type": "number"
            },
            {
                "label": "折扣后金额",
                "type": "input"
            }
        ]
    },
    "商机详情": {
        "headers": [],
        "entityName": "商机详情",
        "fields": [
            {
                "label": "商机名称",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "select",
                "options": [
                    "item.nickname"
                ]
            },
            {
                "label": "客户名称",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "商机状态组",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "预计成交日期",
                "type": "date"
            },
            {
                "label": "备注",
                "type": "textarea"
            },
            {
                "label": "产品总金额",
                "type": "input"
            },
            {
                "label": "整单折扣（%）",
                "type": "number"
            },
            {
                "label": "折扣后金额",
                "type": "input"
            }
        ]
    },
    "待办事项": {
        "headers": [
            "客户名称",
            "联系方式",
            "客户来源",
            "负责人",
            "计划联系时间",
            "上次跟进"
        ],
        "entityName": "待办事项",
        "fields": [
            {
                "label": "客户名称",
                "type": "input",
                "required": true
            },
            {
                "label": "联系方式",
                "type": "input"
            },
            {
                "label": "客户来源",
                "type": "input"
            },
            {
                "label": "负责人",
                "type": "input"
            },
            {
                "label": "上次跟进",
                "type": "input"
            }
        ]
    },
    "我的任务": {
        "headers": [
            "流程",
            "摘要",
            "当前任务",
            "任务编号"
        ],
        "entityName": "我的任务",
        "fields": [
            {
                "label": "流程",
                "type": "input"
            },
            {
                "label": "摘要",
                "type": "input"
            },
            {
                "label": "当前任务",
                "type": "input"
            }
        ]
    },
    "任务详情": {
        "headers": [],
        "entityName": "任务详情",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "流程表达式": {
        "headers": [
            "编号",
            "名字",
            "状态",
            "表达式",
            "创建时间"
        ],
        "entityName": "流程表达式",
        "fields": [
            {
                "label": "名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "表达式",
                "required": true,
                "type": "textarea"
            }
        ]
    },
    "请假申请列表": {
        "headers": [
            "申请编号",
            "状态",
            "请假类型",
            "原因",
            "申请时间"
        ],
        "entityName": "请假申请列表",
        "fields": [
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "请假类型",
                "type": "input"
            },
            {
                "label": "原因",
                "type": "input"
            }
        ]
    },
    "请假详情": {
        "headers": [],
        "entityName": "请假详情",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "发起请假": {
        "headers": [],
        "entityName": "发起请假",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "流程模型管理": {
        "headers": [
            "编号",
            "流程名称",
            "流程标识",
            "版本",
            "状态",
            "创建时间"
        ],
        "entityName": "流程模型",
        "fields": [
            {
                "label": "流程名称",
                "type": "input",
                "required": true
            },
            {
                "label": "流程标识",
                "type": "input"
            },
            {
                "label": "版本",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "动态表单": {
        "headers": [
            "编号",
            "表单名称",
            "流程关联数",
            "字段数量",
            "状态",
            "创建时间"
        ],
        "entityName": "动态表单",
        "fields": [
            {
                "label": "表单名称",
                "type": "input",
                "required": true
            },
            {
                "label": "流程关联数",
                "type": "input"
            },
            {
                "label": "字段数量",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "流程定义管理": {
        "headers": [
            "定义编号",
            "流程名称",
            "流程图标",
            "可见范围",
            "流程类型",
            "表单信息",
            "流程版本"
        ],
        "entityName": "流程定义",
        "fields": [
            {
                "label": "流程名称",
                "type": "input",
                "required": true
            },
            {
                "label": "流程图标",
                "type": "input"
            },
            {
                "label": "可见范围",
                "type": "input"
            },
            {
                "label": "流程类型",
                "type": "input"
            },
            {
                "label": "表单信息",
                "type": "input"
            },
            {
                "label": "流程版本",
                "type": "input"
            }
        ]
    },
    "用户分组": {
        "headers": [
            "编号",
            "组名",
            "描述",
            "成员",
            "状态",
            "创建时间"
        ],
        "entityName": "用户分组",
        "fields": [
            {
                "label": "组名",
                "required": true,
                "type": "input"
            },
            {
                "label": "成员",
                "required": true,
                "type": "select",
                "options": [
                    "user.nickname"
                ]
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "流程监听器": {
        "headers": [
            "编号",
            "名字",
            "类型",
            "状态",
            "事件",
            "值类型",
            "值",
            "创建时间"
        ],
        "entityName": "流程监听器",
        "fields": [
            {
                "label": "名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "事件",
                "required": true,
                "type": "select",
                "options": [
                    "event"
                ]
            },
            {
                "label": "值类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "类路径",
                "required": true,
                "type": "input"
            },
            {
                "label": "表达式",
                "required": true,
                "type": "input"
            }
        ]
    },
    "用户组管理": {
        "headers": [
            "编号",
            "组名",
            "描述",
            "成员",
            "状态",
            "创建时间"
        ],
        "entityName": "用户组",
        "fields": [
            {
                "label": "组名",
                "required": true,
                "type": "input"
            },
            {
                "label": "成员",
                "required": true,
                "type": "select",
                "options": [
                    "user.nickname"
                ]
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            }
        ]
    },
    "动态表单管理": {
        "headers": [
            "编号",
            "表单名",
            "状态",
            "备注",
            "创建时间"
        ],
        "entityName": "动态表单",
        "fields": [
            {
                "label": "名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "事件",
                "required": true,
                "type": "select",
                "options": [
                    "event"
                ]
            },
            {
                "label": "值类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "类路径",
                "required": true,
                "type": "input"
            },
            {
                "label": "表达式",
                "required": true,
                "type": "input"
            }
        ]
    },
    "表单设计器": {
        "headers": [],
        "entityName": "表单设计器",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "流程分类管理": {
        "headers": [
            "分类编号",
            "分类名",
            "分类标志",
            "分类描述",
            "分类状态",
            "分类排序"
        ],
        "entityName": "流程分类",
        "fields": [
            {
                "label": "分类名",
                "required": true,
                "type": "input"
            },
            {
                "label": "分类标志",
                "required": true,
                "type": "input"
            },
            {
                "label": "分类描述",
                "type": "textarea"
            },
            {
                "label": "分类状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "分类排序",
                "required": true,
                "type": "number"
            }
        ]
    },
    "AI 写作": {
        "headers": [],
        "entityName": "AI 写作",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "写作管理": {
        "headers": [
            "编号",
            "用户",
            "写作类型",
            "标题",
            "字数",
            "状态",
            "创建时间"
        ],
        "entityName": "写作",
        "fields": [
            {
                "label": "用户",
                "type": "input"
            },
            {
                "label": "写作类型",
                "type": "input"
            },
            {
                "label": "标题",
                "type": "input"
            },
            {
                "label": "字数",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "工作流": {
        "headers": [],
        "entityName": "工作流",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "工具管理": {
        "headers": [
            "编号",
            "工具名称",
            "工具标识",
            "描述",
            "参数数",
            "状态",
            "创建时间"
        ],
        "entityName": "工具",
        "fields": [
            {
                "label": "工具名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "工具描述",
                "type": "textarea"
            },
            {
                "label": "状态",
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            }
        ]
    },
    "AI 音乐": {
        "headers": [],
        "entityName": "AI 音乐",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "音乐管理": {
        "headers": [
            "编号",
            "用户编号",
            "音乐标题",
            "音乐风格",
            "歌词摘要",
            "时长",
            "状态",
            "创建时间"
        ],
        "entityName": "音乐",
        "fields": [
            {
                "label": "音乐标题",
                "type": "input"
            },
            {
                "label": "音乐风格",
                "type": "input"
            },
            {
                "label": "歌词摘要",
                "type": "input"
            },
            {
                "label": "时长",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "模型管理": {
        "headers": [
            "编号",
            "模型名称",
            "模型标识",
            "类型",
            "状态",
            "创建时间"
        ],
        "entityName": "模型",
        "fields": [
            {
                "label": "所属平台",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "模型类型",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "API 秘钥",
                "required": true,
                "type": "select",
                "options": [
                    "apiKey.name"
                ]
            },
            {
                "label": "模型名字",
                "required": true,
                "type": "input"
            },
            {
                "label": "模型标识",
                "required": true,
                "type": "input"
            },
            {
                "label": "模型排序",
                "required": true,
                "type": "number"
            },
            {
                "label": "开启状态",
                "required": true,
                "type": "radio"
            },
            {
                "label": "温度参数",
                "type": "number"
            },
            {
                "label": "回复数 Token 数",
                "type": "number"
            },
            {
                "label": "上下文数量",
                "type": "number"
            }
        ]
    },
    "思维导图": {
        "headers": [],
        "entityName": "思维导图",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "思维导图管理": {
        "headers": [
            "编号",
            "名称",
            "描述",
            "状态",
            "创建时间"
        ],
        "entityName": "思维导图",
        "fields": [
            {
                "label": "名称",
                "type": "input",
                "required": true
            },
            {
                "label": "描述",
                "type": "textarea"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "知识库": {
        "headers": [
            "编号",
            "知识库名称",
            "描述",
            "文档数",
            "状态",
            "创建时间"
        ],
        "entityName": "知识库",
        "fields": [
            {
                "label": "知识库名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "知识库描述",
                "type": "textarea"
            },
            {
                "label": "向量模型",
                "required": true,
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "检索 topK",
                "required": true,
                "type": "number"
            },
            {
                "label": "检索相似度阈值",
                "required": true,
                "type": "number"
            },
            {
                "label": "是否启用",
                "required": true,
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            }
        ]
    },
    "知识库分段": {
        "headers": [
            "编号",
            "文档编号",
            "所属文档",
            "关键词",
            "内容",
            "字符数",
            "状态",
            "创建时间"
        ],
        "entityName": "知识库分段",
        "fields": [
            {
                "label": "切片内容",
                "required": true,
                "type": "textarea"
            }
        ]
    },
    "知识库文档": {
        "headers": [
            "编号",
            "文档名称",
            "所属知识库",
            "分段状态",
            "分段数",
            "状态",
            "创建时间"
        ],
        "entityName": "知识库文档",
        "fields": [
            {
                "label": "知识库名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "知识库描述",
                "type": "textarea"
            },
            {
                "label": "向量模型",
                "required": true,
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "检索 topK",
                "required": true,
                "type": "number"
            },
            {
                "label": "检索相似度阈值",
                "required": true,
                "type": "number"
            },
            {
                "label": "是否启用",
                "required": true,
                "type": "radio",
                "options": [
                    "dict.value"
                ]
            }
        ]
    },
    "AI 绘图": {
        "headers": [],
        "entityName": "AI 绘图",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "绘图广场": {
        "headers": [],
        "entityName": "绘图广场",
        "fields": [
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "编码",
                "type": "input"
            },
            {
                "label": "排序",
                "required": true,
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            },
            {
                "label": "备注",
                "type": "textarea"
            }
        ]
    },
    "绘图管理": {
        "headers": [
            "编号",
            "缩略图",
            "用户",
            "模型",
            "提示词",
            "图片尺寸",
            "状态",
            "创建时间"
        ],
        "entityName": "绘图",
        "fields": [
            {
                "label": "缩略图",
                "type": "input"
            },
            {
                "label": "用户",
                "type": "input"
            },
            {
                "label": "模型",
                "type": "input"
            },
            {
                "label": "提示词",
                "type": "input"
            },
            {
                "label": "图片尺寸",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "对话管理": {
        "headers": [
            "对话编号",
            "对话标题",
            "用户",
            "角色",
            "模型标识",
            "消息数",
            "创建时间",
            "温度参数",
            "回复Token数",
            "上下文数量"
        ],
        "entityName": "对话",
        "fields": [
            {
                "label": "对话标题",
                "type": "input"
            },
            {
                "label": "用户",
                "type": "input"
            },
            {
                "label": "角色",
                "type": "input"
            },
            {
                "label": "模型标识",
                "type": "input"
            },
            {
                "label": "消息数",
                "type": "input"
            },
            {
                "label": "温度参数",
                "type": "input"
            },
            {
                "label": "回复Token数",
                "type": "input"
            },
            {
                "label": "上下文数量",
                "type": "input"
            }
        ]
    },
    "AI 聊天": {
        "headers": [],
        "entityName": "AI 聊天",
        "fields": [
            {
                "label": "角色名称",
                "type": "input"
            },
            {
                "label": "角色头像",
                "type": "input"
            },
            {
                "label": "绑定模型",
                "type": "select",
                "options": [
                    "model.name"
                ]
            },
            {
                "label": "角色类别",
                "type": "input"
            },
            {
                "label": "角色描述",
                "type": "textarea"
            },
            {
                "label": "角色设定",
                "type": "textarea"
            },
            {
                "label": "引用知识库",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "引用工具",
                "type": "select",
                "options": [
                    "item.name"
                ]
            },
            {
                "label": "引用 MCP",
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "是否公开",
                "type": "radio"
            },
            {
                "label": "角色排序",
                "type": "number"
            },
            {
                "label": "开启状态",
                "type": "radio"
            }
        ]
    },
    "聊天管理": {
        "headers": [
            "编号",
            "用户编号",
            "用户名",
            "AI 模型",
            "对话摘要",
            "消息数",
            "状态",
            "创建时间"
        ],
        "entityName": "聊天",
        "fields": [
            {
                "label": "用户名",
                "type": "input"
            },
            {
                "label": "AI 模型",
                "type": "input"
            },
            {
                "label": "对话摘要",
                "type": "input"
            },
            {
                "label": "消息数",
                "type": "input"
            },
            {
                "label": "状态",
                "type": "select",
                "options": [
                    "开启",
                    "关闭"
                ]
            }
        ]
    },
    "API 密钥管理": {
        "headers": [
            "编号",
            "密钥名称",
            "API 密钥",
            "模型类型",
            "余额",
            "状态",
            "过期时间"
        ],
        "entityName": "API 密钥",
        "fields": [
            {
                "label": "所属平台",
                "required": true,
                "type": "select",
                "options": [
                    "dict.label"
                ]
            },
            {
                "label": "名称",
                "required": true,
                "type": "input"
            },
            {
                "label": "密钥",
                "required": true,
                "type": "input"
            },
            {
                "label": "自定义 API URL",
                "type": "input"
            },
            {
                "label": "状态",
                "required": true,
                "type": "radio"
            }
        ]
    }
};

console.log('字段配置加载完成:', Object.keys(window.PAGE_FIELDS_CONFIG).length, '个页面');
