import React, { useState } from 'react';
import { 
  Button, 
  Typography, 
  Box, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Tooltip,
  useTheme
} from '@mui/material';
import { Wallet, LogOut, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import useWallet from '@/hooks/useWallet';
import { shortenAddress } from '@/utils/format';
import toast from 'react-hot-toast';

const WalletButton: React.FC = () => {
  const theme = useTheme();
  const { 
    isConnected, 
    address, 
    balance, 
    connect, 
    disconnect, 
    chainId,
    isCorrectNetwork,
    switchToCorrectNetwork
  } = useWallet();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isConnected) {
      setAnchorEl(event.currentTarget);
    } else {
      connect();
    }
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        toast.success('Address copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy address');
      }
    }
  };
  
  const handleViewOnExplorer = () => {
    if (address) {
      // This is a simplified example - in a real app, you'd use the correct explorer URL based on chainId
      const explorerUrl = `https://etherscan.io/address/${address}`;
      window.open(explorerUrl, '_blank');
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
    handleClose();
  };

  return (
    <>
      {isConnected ? (
        <>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClick}
            startIcon={isCorrectNetwork ? <Wallet size={16} /> : <AlertTriangle size={16} color={theme.palette.warning.main} />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              border: isCorrectNetwork ? `1px solid ${theme.palette.divider}` : `1px solid ${theme.palette.warning.main}`,
              color: isCorrectNetwork ? 'text.primary' : 'warning.main',
              '&:hover': {
                borderColor: isCorrectNetwork ? 'primary.main' : 'warning.main',
              }
            }}
          >
            {isCorrectNetwork ? (
              shortenAddress(address || '')
            ) : (
              'Wrong Network'
            )}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                mt: 1.5,
                width: 220,
                borderRadius: 2,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Connected Wallet
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-all' }}>
                {shortenAddress(address || '')}
              </Typography>
              
              {balance !== null && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Balance: {balance} ETH
                </Typography>
              )}
            </Box>
            
            <Divider />
            
            {!isCorrectNetwork && (
              <MenuItem onClick={switchToCorrectNetwork}>
                <ListItemIcon>
                  <AlertTriangle size={18} color={theme.palette.warning.main} />
                </ListItemIcon>
                <ListItemText 
                  primary="Switch Network" 
                  secondary="Connect to the correct network"
                  primaryTypographyProps={{ color: 'warning.main' }}
                />
              </MenuItem>
            )}
            
            <MenuItem onClick={handleCopyAddress}>
              <ListItemIcon>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </ListItemIcon>
              <ListItemText primary="Copy Address" />
            </MenuItem>
            
            <MenuItem onClick={handleViewOnExplorer}>
              <ListItemIcon>
                <ExternalLink size={18} />
              </ListItemIcon>
              <ListItemText primary="View on Explorer" />
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleDisconnect}>
              <ListItemIcon>
                <LogOut size={18} />
              </ListItemIcon>
              <ListItemText primary="Disconnect" />
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Tooltip title="Connect your wallet">
          <Button
            variant="outlined"
            size="small"
            onClick={connect}
            startIcon={<Wallet size={16} />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Connect
          </Button>
        </Tooltip>
      )}
    </>
  );
};

export default WalletButton;