import React from 'react';
import { ShoppingCartIcon } from 'lucide-react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/router';

interface CartIconProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showBadge?: boolean;
  onClick?: () => void;
}

export const CartIcon: React.FC<CartIconProps> = ({
  className = '',
  size = 'medium',
  color = 'inherit',
  showBadge = true,
  onClick
}) => {
  const { cart } = useCart();
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/cart');
    }
  };

  const iconSize = size === 'small' ? 18 : size === 'large' ? 28 : 24;

  return (
    <Tooltip title="View Cart" arrow>
      <IconButton
        onClick={handleClick}
        className={className}
        size={size}
        sx={{
          color: color,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Badge
          badgeContent={showBadge ? cart.totalItems : 0}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              height: '18px',
              minWidth: '18px',
            },
          }}
        >
          <ShoppingCartIcon size={iconSize} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default CartIcon;