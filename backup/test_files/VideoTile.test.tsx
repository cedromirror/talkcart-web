import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoTile from '../../streaming/VideoTile';

// Minimal mock for HTMLVideoElement srcObject to avoid errors in JSDOM
Object.defineProperty(global.HTMLMediaElement.prototype, 'srcObject', {
  writable: true,
  value: null,
});

describe('VideoTile', () => {
  it('renders title', () => {
    render(<VideoTile title="Guest 1234" stream={null} />);
    expect(screen.getByText('Guest 1234')).toBeInTheDocument();
  });

  it('shows Host badge when isHost is true', () => {
    render(<VideoTile title="Alice" stream={null} isHost />);
    expect(screen.getByText('Host')).toBeInTheDocument();
  });

  it('shows Publisher badge when isPublisher is true and not host', () => {
    render(<VideoTile title="Bob" stream={null} isPublisher />);
    expect(screen.getByText('Publisher')).toBeInTheDocument();
  });

  it('does not show Publisher badge when isHost is true', () => {
    render(<VideoTile title="Carol" stream={null} isHost isPublisher />);
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.queryByText('Publisher')).not.toBeInTheDocument();
  });
});