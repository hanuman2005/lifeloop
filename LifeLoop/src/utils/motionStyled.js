// frontend/src/utils/motionStyled.js
// Utility to create styled-components that work properly with Framer Motion
// This prevents whileHover/whileTap/etc props from being passed to the DOM

import styled from "styled-components";
import { motion } from "framer-motion";

// List of Framer Motion props that should not be forwarded to the DOM
const motionProps = [
  "initial",
  "animate",
  "exit",
  "variants",
  "transition",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "dragPropagation",
  "dragSnapToOrigin",
  "dragTransition",
  "onDrag",
  "onDragStart",
  "onDragEnd",
  "onDirectionLock",
  "layout",
  "layoutId",
  "layoutDependency",
  "onLayoutAnimationStart",
  "onLayoutAnimationComplete",
  "style",
  "transformTemplate",
  "custom",
  "inherit",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onPan",
  "onPanStart",
  "onPanEnd",
  "onTap",
  "onTapStart",
  "onTapCancel",
  "onHoverStart",
  "onHoverEnd",
  "onViewportEnter",
  "onViewportLeave",
];

// Check if a prop should be forwarded to the DOM
export const shouldForwardProp = (prop) => !motionProps.includes(prop);

// Export the motionProps list for reference
export { motionProps };

// Create a motion-enabled styled component
// Usage: const MotionButton = createMotionComponent(styled.button`...`)
export const createMotionComponent = (StyledComponent) => {
  return styled(motion(StyledComponent.target || "div")).withConfig({
    shouldForwardProp,
  })(StyledComponent.componentStyle?.rules || []);
};

// Create styled components with shouldForwardProp built-in
// These can be used with as={motion.div} etc without prop warnings
export const styledWithMotion = {
  button: styled.button.withConfig({ shouldForwardProp }),
  div: styled.div.withConfig({ shouldForwardProp }),
  span: styled.span.withConfig({ shouldForwardProp }),
  a: styled.a.withConfig({ shouldForwardProp }),
  input: styled.input.withConfig({ shouldForwardProp }),
  form: styled.form.withConfig({ shouldForwardProp }),
  section: styled.section.withConfig({ shouldForwardProp }),
  article: styled.article.withConfig({ shouldForwardProp }),
  header: styled.header.withConfig({ shouldForwardProp }),
  footer: styled.footer.withConfig({ shouldForwardProp }),
  nav: styled.nav.withConfig({ shouldForwardProp }),
  ul: styled.ul.withConfig({ shouldForwardProp }),
  li: styled.li.withConfig({ shouldForwardProp }),
  p: styled.p.withConfig({ shouldForwardProp }),
  h1: styled.h1.withConfig({ shouldForwardProp }),
  h2: styled.h2.withConfig({ shouldForwardProp }),
  h3: styled.h3.withConfig({ shouldForwardProp }),
  img: styled.img.withConfig({ shouldForwardProp }),
  label: styled.label.withConfig({ shouldForwardProp }),
  textarea: styled.textarea.withConfig({ shouldForwardProp }),
  select: styled.select.withConfig({ shouldForwardProp }),
};

export default styledWithMotion;
