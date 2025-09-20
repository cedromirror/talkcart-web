import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Button,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Divider,
  TextField,
  InputAdornment,
  Skeleton,
  useTheme,
} from '@mui/material';
import { 
  Search, 
  Vote, 
  Users, 
  ChevronRight, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock,
  Wallet,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import useDAO from '@/hooks/useDAO';

// Types
interface DAO {
  id: string;
  name: string;
  symbol: string;
  description: string;
  logo: string;
  contractAddress: string;
  tokenAddress: string;
  memberCount: number;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  createdAt: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  dao: {
    id: string;
    name: string;
    symbol: string;
    logo: string;
  };
  proposer: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress: string;
  };
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  quorum: number;
  createdAt: string;
  endDate: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dao-tabpanel-${index}`}
      aria-labelledby={`dao-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `dao-tab-${index}`,
    'aria-controls': `dao-tabpanel-${index}`,
  };
}

const DAOPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { 
    daos, 
    proposals, 
    loading, 
    error, 
    fetchDAOs, 
    fetchProposals, 
    castVote 
  } = useDAO();
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDAOs(searchQuery);
    fetchProposals(searchQuery);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  // Calculate vote percentage
  const calculateVotePercentage = (votesFor: number, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return (votesFor / totalVotes) * 100;
  };
  
  // Calculate quorum percentage
  const calculateQuorumPercentage = (totalVotes: number, quorum: number) => {
    return Math.min((totalVotes / quorum) * 100, 100);
  };
  
  // Handle vote
  const handleVote = async (proposalId: string, voteType: 'for' | 'against' | 'abstain') => {
    const success = await castVote(proposalId, voteType);
    if (success) {
      // Could show a success message here
    }
  };
  

  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              DAO Governance
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Participate in decentralized governance and decision making
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<Plus size={18} />}
            size="large"
          >
            Create DAO
          </Button>
        </Box>
        
        {/* Search */}
        <Card variant="outlined" sx={{ mb: 4, p: 2, borderRadius: 2 }}>
          <Box component="form" onSubmit={handleSearch}>
            <TextField
              fullWidth
              placeholder="Search DAOs and proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button 
                      variant="contained" 
                      type="submit"
                    >
                      Search
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </Card>
        
        {/* DAO Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="dao tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<Users size={16} />} 
              label="DAOs" 
              {...a11yProps(0)} 
              sx={{ textTransform: 'none' }}
            />
            <Tab 
              icon={<Vote size={16} />} 
              label="Proposals" 
              {...a11yProps(1)} 
              sx={{ textTransform: 'none' }}
            />
          </Tabs>
        </Box>
        
        {/* Error message */}
        {error && (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        
        {/* DAOs Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {loading ? (
              // Loading skeletons
              Array.from(new Array(3)).map((_, index) => (
                <Grid item xs={12} key={index}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Skeleton variant="circular" width={64} height={64} sx={{ mr: 2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Skeleton variant="text" height={32} width="40%" />
                          <Skeleton variant="text" height={24} width="20%" />
                        </Box>
                        <Skeleton variant="rectangular" width={120} height={36} />
                      </Box>
                      <Skeleton variant="text" height={20} sx={{ mt: 2 }} />
                      <Skeleton variant="text" height={20} width="80%" />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Skeleton variant="text" height={20} width="30%" />
                        <Skeleton variant="text" height={20} width="20%" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : daos.length > 0 ? (
              daos.map((dao) => (
                <Grid item xs={12} key={dao.id}>
                  <Card sx={{ 
                    borderRadius: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4],
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          src={dao.logo} 
                          alt={dao.name}
                          sx={{ width: 64, height: 64, mr: 2 }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h5" component="h2">
                            {dao.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip 
                              label={dao.symbol} 
                              color="primary" 
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              Created by {dao.creator.displayName}
                              {dao.creator.isVerified && (
                                <Chip 
                                  label="Verified" 
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                  sx={{ ml: 1, height: 20, fontSize: '0.625rem' }}
                                />
                              )}
                            </Typography>
                          </Box>
                        </Box>
                        <Button 
                          variant="contained" 
                          endIcon={<ChevronRight size={16} />}
                        >
                          View DAO
                        </Button>
                      </Box>
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        {dao.description}
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        mt: 2,
                        pt: 2,
                        borderTop: `1px solid ${theme.palette.divider}`
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Users size={16} color={theme.palette.text.secondary} style={{ marginRight: 8 }} />
                          <Typography variant="body2" color="text.secondary">
                            {dao.memberCount.toLocaleString()} members
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Created {formatDate(dao.createdAt)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', width: '100%', py: 4 }}>
                <Users size={48} color={theme.palette.text.secondary} style={{ marginBottom: 16 }} />
                <Typography variant="h6" color="text.secondary">
                  No DAOs found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create a new DAO or try a different search
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Plus size={18} />}
                >
                  Create DAO
                </Button>
              </Box>
            )}
          </Grid>
        </TabPanel>
        
        {/* Proposals Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {loading ? (
              // Loading skeletons
              Array.from(new Array(3)).map((_, index) => (
                <Grid item xs={12} key={index}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardHeader
                      avatar={<Skeleton variant="circular" width={40} height={40} />}
                      title={<Skeleton variant="text" height={24} width="60%" />}
                      subheader={<Skeleton variant="text" height={20} width="40%" />}
                    />
                    <CardContent>
                      <Skeleton variant="text" height={20} />
                      <Skeleton variant="text" height={20} width="90%" />
                      <Skeleton variant="rectangular" height={40} sx={{ mt: 2, mb: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Skeleton variant="text" height={20} width="30%" />
                        <Skeleton variant="text" height={20} width="20%" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : proposals.length > 0 ? (
              proposals.map((proposal) => (
                <Grid item xs={12} key={proposal.id}>
                  <Card sx={{ 
                    borderRadius: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4],
                    }
                  }}>
                    <CardHeader
                      avatar={
                        <Avatar 
                          src={proposal.dao.logo} 
                          alt={proposal.dao.name}
                        />
                      }
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h6">
                            {proposal.title}
                          </Typography>
                          {proposal.status === 'active' && (
                            <Chip 
                              label="Active" 
                              color="primary" 
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          {proposal.status === 'passed' && (
                            <Chip 
                              label="Passed" 
                              color="success" 
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          {proposal.status === 'rejected' && (
                            <Chip 
                              label="Rejected" 
                              color="error" 
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          {proposal.status === 'pending' && (
                            <Chip 
                              label="Pending" 
                              color="warning" 
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      subheader={
                        <Typography variant="body2" color="text.secondary">
                          {proposal.dao.name} ({proposal.dao.symbol})
                        </Typography>
                      }
                    />
                    <CardContent>
                      <Typography variant="body2" paragraph>
                        {proposal.description}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">
                            Votes
                          </Typography>
                          <Typography variant="body2">
                            {calculateVotePercentage(proposal.votesFor, proposal.totalVotes).toFixed(1)}% in favor
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <Box 
                            sx={{ 
                              width: `${calculateVotePercentage(proposal.votesFor, proposal.totalVotes)}%`,
                              bgcolor: 'success.main'
                            }} 
                          />
                          <Box 
                            sx={{ 
                              width: `${calculateVotePercentage(proposal.votesAgainst, proposal.totalVotes)}%`,
                              bgcolor: 'error.main'
                            }} 
                          />
                          <Box 
                            sx={{ 
                              width: `${calculateVotePercentage(proposal.votesAbstain, proposal.totalVotes)}%`,
                              bgcolor: 'grey.400'
                            }} 
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircle size={14} color={theme.palette.success.main} style={{ marginRight: 4 }} />
                            <Typography variant="caption" color="text.secondary">
                              {proposal.votesFor.toLocaleString()} For
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <XCircle size={14} color={theme.palette.error.main} style={{ marginRight: 4 }} />
                            <Typography variant="caption" color="text.secondary">
                              {proposal.votesAgainst.toLocaleString()} Against
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Clock size={14} color={theme.palette.grey[500]} style={{ marginRight: 4 }} />
                            <Typography variant="caption" color="text.secondary">
                              {proposal.votesAbstain.toLocaleString()} Abstain
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">
                            Quorum
                          </Typography>
                          <Typography variant="body2">
                            {calculateQuorumPercentage(proposal.totalVotes, proposal.quorum).toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={calculateQuorumPercentage(proposal.totalVotes, proposal.quorum)} 
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {proposal.totalVotes.toLocaleString()} of {proposal.quorum.toLocaleString()} votes needed
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={proposal.proposer.avatar} 
                            alt={proposal.proposer.displayName}
                            sx={{ width: 24, height: 24, mr: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Proposed by {proposal.proposer.displayName}
                          </Typography>
                        </Box>
                        
                        {proposal.status === 'active' ? (
                          <Button 
                            variant="contained" 
                            startIcon={<Vote size={16} />}
                          >
                            Vote Now
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Ended {formatDate(proposal.endDate)}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', width: '100%', py: 4 }}>
                <Vote size={48} color={theme.palette.text.secondary} style={{ marginBottom: 16 }} />
                <Typography variant="h6" color="text.secondary">
                  No proposals found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create a new proposal or try a different search
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Plus size={18} />}
                >
                  Create Proposal
                </Button>
              </Box>
            )}
          </Grid>
        </TabPanel>
      </Container>
    </Layout>
  );
};

export default DAOPage;