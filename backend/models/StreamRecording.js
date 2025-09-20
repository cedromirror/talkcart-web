const mongoose = require('mongoose');

const streamRecordingSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  streamerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  fileName: String,
  filePath: String,
  fileUrl: String, // Public URL to access recording
  fileSize: {
    type: Number,
    default: 0 // in bytes
  },
  duration: {
    type: Number,
    default: 0 // in seconds
  },
  quality: {
    resolution: String,
    bitrate: Number,
    fps: Number
  },
  format: {
    type: String,
    default: 'mp4',
    enum: ['mp4', 'webm', 'avi', 'mov']
  },
  status: {
    type: String,
    enum: ['recording', 'processing', 'completed', 'failed', 'deleted'],
    default: 'recording'
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: Date,
  processedAt: Date,
  thumbnail: {
    public_id: String,
    secure_url: String,
    url: String
  },
  metadata: {
    codec: String,
    audioCodec: String,
    videoCodec: String,
    totalFrames: Number,
    droppedFrames: Number
  },
  privacy: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public'
  },
  views: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  tags: [String],
  chapters: [{
    title: String,
    startTime: Number, // in seconds
    endTime: Number
  }]
}, {
  timestamps: true
});

// Indexes
streamRecordingSchema.index({ streamId: 1, status: 1 });
streamRecordingSchema.index({ streamerId: 1, createdAt: -1 });
streamRecordingSchema.index({ status: 1, privacy: 1 });

// Virtual for formatted file size
streamRecordingSchema.virtual('formattedSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for formatted duration
streamRecordingSchema.virtual('formattedDuration').get(function() {
  const seconds = this.duration;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
});

module.exports = mongoose.model('StreamRecording', streamRecordingSchema);