import {
  CSSProperties,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
} from "react";
import useWatermark from "./useWatermark";

export interface WatermarkProps extends PropsWithChildren {
  style?: CSSProperties;
  className?: string;
  zIndex?: string | number; // 追加的水印元素的 z-index
  width?: number; // 水印的宽度，content 的默认值为自身的宽度
  height?: number; // 水印的高度，content 的默认值为自身的高度
  rotate?: number; // 水印绘制时，旋转的角度，单位
  image?: string; // 图片源，建议导出 2 倍或 3 倍图，优先级高 (支持 base64 格式)
  content?: string | string[]; // 水印文字内容
  fontStyle?: {
    // 文字样式
    color?: string;
    fontFamily?: string;
    fontSize?: number | string;
    fontWeight?: number | string;
  };
  gap?: [number, number]; // 水印之间的间距
  offset?: [number, number]; // 水印距离容器左上角的偏移量
  getContainer?: () => HTMLElement;
}

const Watermark: FC<WatermarkProps> = (props) => {
  console.log("props", props);

  const {
    className,
    style,
    zIndex,
    width,
    height,
    rotate,
    image,
    content,
    fontStyle,
    gap,
    offset,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  const getContainer = useCallback(() => {
    return props.getContainer ? props.getContainer() : containerRef.current!;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current, props.getContainer]);

  const { generateWatermark } = useWatermark({
    zIndex,
    width,
    height,
    rotate,
    image,
    content,
    fontStyle,
    gap,
    offset,
    getContainer,
  });

  // 当参数变化的时候，重新调用 generateWatermark 绘制水印
  useEffect(() => {
    generateWatermark({
      zIndex,
      width,
      height,
      rotate,
      image,
      content,
      fontStyle,
      gap,
      offset,
      getContainer,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    zIndex,
    width,
    height,
    rotate,
    image,
    content,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(props.fontStyle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(props.gap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(props.offset),
    getContainer,
  ]); // 引用数据类型的依赖 需要序列化

  return props.children ? (
    <div ref={containerRef} className={className} style={style}>
      {props.children}
    </div>
  ) : null;
};

export default Watermark;
