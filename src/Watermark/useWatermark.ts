import { useEffect, useRef, useState } from "react";
import { WatermarkProps } from ".";
import { merge } from "lodash-es";

export type WatermarkOptions = Omit<
  WatermarkProps,
  "className" | "style" | "children"
>;

export const isNumber = (obj: unknown): obj is number => {
  return (
    Object.prototype.toString.call(obj) === "[object Number]" && obj === obj // obj === obj 用于 排除 NaN 的情况，因为 NaN 是唯一一个不等于自身的值
  );
};

const toNumber = (value?: string | number, defaultValue?: number) => {
  if (!value) return defaultValue;

  if (isNumber(value)) return value;

  const numVal = parseFloat(value);

  return isNumber(numVal) ? numVal : defaultValue;
};

const defaultOptions = {
  rotate: -20,
  zIndex: 1,
  width: 100,
  gap: [100, 100],
  fontStyle: {
    fontSize: "16px",
    color: "rgba(0, 0, 0, 0.15)",
    fontFamily: "sans-serif",
    fontWeight: "normal",
  },
  getContainer: () => document.body,
};

const getMergedOptions = (o: Partial<WatermarkOptions>) => {
  const options = o || {};

  const mergedOptions = {
    ...options,
    rotate: options.rotate || defaultOptions.rotate,
    zIndex: options.zIndex || defaultOptions.zIndex,
    fontStyle: { ...defaultOptions.fontStyle, ...options.fontStyle },
    width: toNumber(
      options.width,
      options.image ? defaultOptions.width : undefined
    ),
    height: toNumber(options.height, undefined)!,
    getContainer: options.getContainer!,
    gap: [
      toNumber(options.gap?.[0], defaultOptions.gap[0]),
      toNumber(options.gap?.[1] || options.gap?.[0], defaultOptions.gap[1]),
    ],
  } as Required<WatermarkOptions>;

  const mergedOffsetX = toNumber(mergedOptions.offset?.[0], 0)!;
  const mergedOffsetY = toNumber(
    mergedOptions.offset?.[1] || mergedOptions.offset?.[0],
    0
  )!;
  mergedOptions.offset = [mergedOffsetX, mergedOffsetY];

  return mergedOptions;
};

const getCanvasData = async (
  options: Required<WatermarkOptions>
): Promise<{ width: number; height: number; base64Url: string }> => {
  const { rotate, image, content, fontStyle, gap } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  /**
   *
   * 通过调整画布的实际像素尺寸与显示尺寸的分离，确保内容在高分辨率设备上显示清晰且比例正确。
   *
   * 高分辨率屏幕（如 Retina 屏幕）具有更高的像素密度（DPI，Dots Per Inch）。在这样的设备上，CSS 像素（逻辑像素）与物理像素之间的比例通常不是 1:1
   *
   * 在普通屏幕上，1 个 CSS 像素对应 1 个物理像素。 devicePixelRatio = 1
   * 在高分辨率屏幕上，1 个 CSS 像素可能对应多个物理像素（如 2 个或更多）。 devicePixelRatio = n
   *
   * 1. 放大 canvas 的物理像素尺寸，使其能够渲染出更细腻的内容。
   * 2. 使用 CSS 控制显示的逻辑像素尺寸，保持页面布局不变。
   * 3. 通过上下文缩放，保证绘制的内容比例正确。

   */

  const ratio = window.devicePixelRatio; // 设备像素比，确保在高分辨率屏幕上生成清晰的水印

  const configCanvas = (size: { width: number; height: number }) => {
    const canvasWidth = gap[0] + size.width; // 两个水印间的距离就是 一个canvas画布的大小
    const canvasHeight = gap[1] + size.height;

    // 用于设置画布的实际像素尺寸
    canvas.setAttribute("width", `${canvasWidth * ratio}px`);
    canvas.setAttribute("height", `${canvasHeight * ratio}px`);
    // 控制画布在浏览器中的显示尺寸，与实际像素无关
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // 将画布的原点移动到中心位置
    ctx.translate((canvasWidth * ratio) / 2, (canvasHeight * ratio) / 2);
    // 根据设备像素比缩放上下文，使绘制的内容匹配高分辨率屏幕
    ctx.scale(ratio, ratio);

    // 旋转角度
    const RotateAngle = (rotate * Math.PI) / 180;
    ctx.rotate(RotateAngle);
  };

  const measureTextSize = (
    ctx: CanvasRenderingContext2D,
    content: string[],
    rotate: number
  ) => {
    let width = 0;
    let height = 0;
    const lineSize: Array<{ width: number; height: number }> = [];

    content.forEach((item) => {
      const {
        width: textWidth,
        fontBoundingBoxAscent, //  baseline 到顶部的距离
        fontBoundingBoxDescent, // 到底部的距离
      } = ctx.measureText(item); // 测量文字尺寸

      // 行高
      const textHeight = fontBoundingBoxAscent + fontBoundingBoxDescent;

      if (textWidth > width) {
        width = textWidth;
      }

      height += textHeight;
      lineSize.push({ height: textHeight, width: textWidth });
    });

    // 有旋转的话，要用 sin、cos 函数算出旋转后的宽高
    const angle = (rotate * Math.PI) / 180;

    return {
      originWidth: width,
      originHeight: height,
      width: Math.ceil(
        Math.abs(Math.sin(angle) * height) + Math.abs(Math.cos(angle) * width)
      ),
      height: Math.ceil(
        Math.abs(Math.sin(angle) * width) + Math.abs(height * Math.cos(angle))
      ),
      lineSize,
    };
  };

  const drawText = () => {
    const { fontSize, color, fontWeight, fontFamily } = fontStyle;
    const realFontSize = toNumber(fontSize, 0) || fontStyle.fontSize;

    ctx.font = `${fontWeight} ${realFontSize}px ${fontFamily}`;
    const measureSize = measureTextSize(ctx, [...content], rotate);

    const width = options.width || measureSize.width;
    const height = options.height || measureSize.height;

    configCanvas({ width, height });

    ctx.fillStyle = color!;
    ctx.font = `${fontWeight} ${realFontSize}px ${fontFamily}`;
    ctx.textBaseline = "top"; // 顶部对齐

    // 绘制每一行文本
    [...content].forEach((item, index) => {
      const { height: lineHeight, width: lineWidth } =
        measureSize.lineSize[index];

      // 设为负的行宽的一半，以实现文本的水平居中
      const xStartPoint = -lineWidth / 2;
      const yStartPoint =
        -(options.height || measureSize.originHeight) / 2 + lineHeight * index;

      ctx.fillText(
        item,
        xStartPoint,
        yStartPoint,
        options.width || measureSize.originWidth
      );
    });
    return Promise.resolve({ base64Url: canvas.toDataURL(), height, width });
  };

  const drawImage = () => {
    return new Promise<{ width: number; height: number; base64Url: string }>(
      (resolve) => {
        const img = new Image();
        // 控制图片的跨域加载行为（确保图片可以跨域加载） 和 隐私信息的保护
        img.crossOrigin = "anonymous"; // 不发送用户的身份凭证（如 cookies 和 HTTP 认证信息）
        img.referrerPolicy = "no-referrer"; // 不发送 Referer 信息到目标服务器

        img.src = image;
        img.onload = () => {
          let { width, height } = options;
          if (!width || !height) {
            if (width) {
              height = (img.height / img.width) * +width; // +width = Number(width)
            } else {
              width = (img.width / img.height) * +height;
            }
          }
          configCanvas({ width, height });

          // -width = -Number(width)
          // 将画布的坐标原点（0, 0）设置为图像的中心点，借助 -width / 2 和 -height / 2，让图像从中心位置展开，绘制到画布上。
          // 图像的绘制坐标为左上角的位置。如果希望图像以中心点为基准绘制，需要将图像向左和向上偏移半个宽度和高度。
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          return resolve({ base64Url: canvas.toDataURL(), width, height });
        };
        img.onerror = () => {
          return drawText();
        };
      }
    );
  };

  return image ? drawImage() : drawText();
};

const useWatermark = (params: WatermarkOptions) => {
  const [options, setOptions] = useState(params || {});

  const mergedOptions = getMergedOptions(options);
  const watermarkDiv = useRef<HTMLDivElement>();
  const mutationObserver = useRef<MutationObserver>();

  const container = mergedOptions.getContainer();
  const { zIndex, gap } = mergedOptions;

  function drawWatermark() {
    if (!container) {
      return;
    }

    getCanvasData(mergedOptions).then(({ base64Url, width, height }) => {
      const offsetLeft = mergedOptions.offset[0] + "px";
      const offsetTop = mergedOptions.offset[1] + "px";

      const wmStyle = `
      width:calc(100% - ${offsetLeft});
      height:calc(100% - ${offsetTop});
      position:absolute;
      top:${offsetTop};
      left:${offsetLeft};
      bottom:0;
      right:0;
      pointer-events: none;
      z-index:${zIndex};
      background-position: 0 0;
      background-size:${gap[0] + width}px ${gap[1] + height}px;
      background-repeat: repeat;
      background-image:url(${base64Url})`;

      if (!watermarkDiv.current) {
        const div = document.createElement("div");
        watermarkDiv.current = div;
        container.append(div);
        container.style.position = "relative"; // 水印相对于容器 定位
      }

      watermarkDiv.current?.setAttribute("style", wmStyle.trim());
      if (container) {
        // 1. 创建完水印节点后，首先 disconnect 去掉之前的 MutationObserver 的监听
        // 2. 然后创建新的 MutationObserver 监听 container 的变动。

        mutationObserver.current?.disconnect();

        mutationObserver.current = new MutationObserver((mutations) => {
          const isChanged = mutations.some((mutation) => {
            let flag = false;

            // 子节点被移除
            if (mutation.removedNodes.length) {
              flag = Array.from(mutation.removedNodes).some(
                (node) => node === watermarkDiv.current
              );
            }

            // 子节点属性被修改
            if (
              mutation.type === "attributes" &&
              mutation.target === watermarkDiv.current
            ) {
              flag = true;
            }
            return flag;
          });

          // 判断水印是否删除是通过判断是否修改了 watermark 节点的属性，是否增删了 watermark 节点
          // 如果是，则重新绘制
          if (isChanged) {
            watermarkDiv.current?.parentNode?.removeChild(watermarkDiv.current);
            watermarkDiv.current = undefined;
            drawWatermark();
          }
        });

        // 监听 container 容器，主要是其子节点的变化
        mutationObserver.current.observe(container, {
          attributes: true,
          subtree: true,
          childList: true,
        });
      }
    });
  }

  useEffect(() => {
    drawWatermark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return {
    generateWatermark: (newOptions: Partial<WatermarkOptions>) => {
      setOptions(merge({}, options, newOptions));
    },
  };
};

export default useWatermark;
