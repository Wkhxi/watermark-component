### 简介

```
水印组件。

```

### 实现思路

```
1. 给目标元素上方 覆盖一个宽高一样的 div，设置 pointer-events:none 不响应鼠标事件。
2. 设置背景图片 repeat：background-repeat: repeat;
3. 设置背景图片路径：用 canvas 把 文字/图片画出来，导出 base64 的 data url 设置为 div 的重复背景。 background-position: url(data: image/xxx)
4. 支持防删除功能: MutationObserver 监听水印节点的属性变动、节点删除等，发生变化则重新绘制。

```
