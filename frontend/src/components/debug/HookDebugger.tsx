import { useEffect, useRef } from 'react';

interface HookDebuggerProps {
  componentName: string;
  props?: any;
}

export const HookDebugger: React.FC<HookDebuggerProps> = ({ componentName, props }) => {
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    renderCount.current += 1;
    console.log(`🔍 ${componentName} render #${renderCount.current}`, {
      props,
      propsChanged: JSON.stringify(prevProps.current) !== JSON.stringify(props)
    });
    prevProps.current = props;
  });

  useEffect(() => {
    console.log(`🔍 ${componentName} mounted`);
    return () => {
      console.log(`🔍 ${componentName} unmounted`);
    };
  }, [componentName]);

  return null;
};

export default HookDebugger;