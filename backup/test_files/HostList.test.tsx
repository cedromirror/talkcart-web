import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostList from '../../streaming/HostList';

describe('HostList', () => {
  it('renders nothing when hosts empty', () => {
    const { container } = render(<HostList hosts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders host chips with display names', () => {
    render(<HostList hosts={[{ socketId: 'abc123', displayName: 'Alice' }, { socketId: 'xyz789', displayName: 'Bob' }]} />);
    expect(screen.getByText('Hosts:')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('falls back to socketId suffix when no displayName', () => {
    render(<HostList hosts={[{ socketId: 'socket-1234' }]} />);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });
});