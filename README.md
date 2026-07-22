# Crystal 项目总览

这个目录包含三个彼此独立、围绕水晶手串业务展开的项目。

| 目录 | 用途 | 主要入口 |
| --- | --- | --- |
| `bracelet-designer/` | 串珠设计器，组合与预览手串样式 | `bracelet-designer/index.html` |
| `store-saas/` | 店铺 SaaS Demo，包含手机报价、PC 管理和 Excel 模板 | `store-saas/index.html`、`store-saas/admin.html` |
| `product-website/` | CRYSTAL STORE OS 产品宣传官网 | `product-website/index.html` |

## 本地统一预览

在当前 `crystal` 目录启动一个静态文件服务：

```bash
python3 -m http.server 8765
```

然后访问：

```text
http://localhost:8765/bracelet-designer/
http://localhost:8765/store-saas/
http://localhost:8765/store-saas/admin.html
http://localhost:8765/product-website/
```

三个项目可分别迭代，但仍共享当前 Git 仓库，方便统一保存版本。
