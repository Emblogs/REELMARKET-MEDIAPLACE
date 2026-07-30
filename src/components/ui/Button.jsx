import './ui.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  className = '',
  ...props
}) {
  return (
    <Component className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {children}
    </Component>
  );
}
