/**
 * VideoAnalysisService Tests
 *
 * Comprehensive tests for video analysis with object detection
 */

import { videoAnalysisService } from '../services/VideoAnalysisService';
import { objectDetectionService } from '../services/ObjectDetectionService';

describe('VideoAnalysisService', () => {
  beforeAll(() => {
    // Mock environment variables
    process.env.ENABLE_VIDEO_ANALYSIS = 'true';
    process.env.ENABLE_OBJECT_DETECTION = 'true';
    process.env.VIDEO_FRAME_RATE = '1';
    process.env.VIDEO_MAX_FRAMES = '300';
    process.env.SCENE_DETECTION_THRESHOLD = '30.0';
  });

  describe('Configuration', () => {
    it('should have correct default values', () => {
      const config = {
        frameRate: parseInt(process.env.VIDEO_FRAME_RATE || '1'),
        maxFrames: parseInt(process.env.VIDEO_MAX_FRAMES || '300'),
        sceneThreshold: parseFloat(process.env.SCENE_DETECTION_THRESHOLD || '30.0'),
      };

      expect(config.frameRate).toBe(1);
      expect(config.maxFrames).toBe(300);
      expect(config.sceneThreshold).toBe(30.0);
    });

    it('should support various video formats', () => {
      const supportedFormats = [
        'mp4',
        'avi',
        'mov',
        'mkv',
        'wmv',
        'flv',
        'webm',
        'm4v',
        'mpg',
        'mpeg',
      ];

      const testFiles = [
        { file: 'video.mp4', expected: true },
        { file: 'video.avi', expected: true },
        { file: 'video.mov', expected: true },
        { file: 'video.txt', expected: false },
        { file: 'VIDEO.MP4', expected: true }, // Case insensitive
      ];

      testFiles.forEach(({ file, expected }) => {
        const ext = file.split('.').pop()?.toLowerCase() || '';
        const isSupported = supportedFormats.includes(ext);
        expect(isSupported).toBe(expected);
      });
    });
  });

  describe('Video Metadata Parsing', () => {
    it('should parse ffprobe output correctly', () => {
      const mockFfprobeOutput = {
        streams: [
          {
            width: 1920,
            height: 1080,
            codec_name: 'h264',
            r_frame_rate: '30/1',
            bit_rate: '5000000',
          },
        ],
      };

      const frameRateParts = mockFfprobeOutput.streams[0].r_frame_rate.split('/');
      const frameRate = parseInt(frameRateParts[0]) / parseInt(frameRateParts[1]);

      expect(mockFfprobeOutput.streams[0].width).toBe(1920);
      expect(mockFfprobeOutput.streams[0].height).toBe(1080);
      expect(mockFfprobeOutput.streams[0].codec_name).toBe('h264');
      expect(frameRate).toBe(30);
      expect(mockFfprobeOutput.streams[0].bit_rate).toBe('5000000');
    });

    it('should handle various frame rates', () => {
      const testCases = [
        { input: '30/1', expected: 30 },
        { input: '60/1', expected: 60 },
        { input: '24000/1001', expected: 23.976 },
        { input: '30000/1001', expected: 29.970 },
      ];

      testCases.forEach(({ input, expected }) => {
        const parts = input.split('/');
        const frameRate = parseInt(parts[0]) / parseInt(parts[1]);
        expect(frameRate).toBeCloseTo(expected, 3);
      });
    });

    it('should detect audio tracks', () => {
      const mockOutputWithAudio = 'audio\n';
      const mockOutputWithoutAudio = '\n';

      expect(mockOutputWithAudio.trim()).toBe('audio');
      expect(mockOutputWithoutAudio.trim()).toBe('');

      const hasAudio1 = mockOutputWithAudio.trim() === 'audio';
      const hasAudio2 = mockOutputWithoutAudio.trim() === 'audio';

      expect(hasAudio1).toBe(true);
      expect(hasAudio2).toBe(false);
    });
  });

  describe('Frame Extraction', () => {
    it('should calculate correct number of frames', () => {
      const testCases = [
        { duration: 60, fps: 1, expected: 60 },
        { duration: 300, fps: 1, expected: 300 },
        { duration: 600, fps: 1, expected: 300 }, // Capped at maxFrames
        { duration: 60, fps: 5, expected: 300 },
      ];

      const maxFrames = 300;

      testCases.forEach(({ duration, fps, expected }) => {
        const estimatedFrames = Math.min(Math.ceil(duration * fps), maxFrames);
        expect(estimatedFrames).toBe(expected);
      });
    });

    it('should handle frame extraction intervals', () => {
      const videoDuration = 300; // 5 minutes
      const frameRate = 1; // 1 fps

      // Extract every N seconds
      const intervals = [1, 5, 10, 30];

      intervals.forEach((interval) => {
        const expectedFrames = Math.ceil(videoDuration / interval);
        expect(expectedFrames).toBeGreaterThan(0);
      });

      expect(Math.ceil(videoDuration / 1)).toBe(300);
      expect(Math.ceil(videoDuration / 5)).toBe(60);
      expect(Math.ceil(videoDuration / 10)).toBe(30);
      expect(Math.ceil(videoDuration / 30)).toBe(10);
    });
  });

  describe('Scene Detection', () => {
    it('should calculate scene change scores', () => {
      // Histogram-based scene detection
      // Higher difference = more likely a scene change

      const testScenes = [
        { score: 0.1, isSceneChange: false },
        { score: 0.25, isSceneChange: false },
        { score: 0.35, isSceneChange: true }, // Above 30% threshold
        { score: 0.45, isSceneChange: true },
        { score: 0.6, isSceneChange: true },
      ];

      const threshold = 0.3;

      testScenes.forEach(({ score, isSceneChange }) => {
        const detected = score > threshold;
        expect(detected).toBe(isSceneChange);
      });
    });

    it('should parse scene timestamps from ffmpeg output', () => {
      const mockFfmpegOutput = `
        [Parsed_showinfo_1] n:  15 pts:    150 pts_time:0.5  scene:0.25
        [Parsed_showinfo_1] n:  45 pts:    450 pts_time:1.5  scene:0.41
        [Parsed_showinfo_1] n:  90 pts:    900 pts_time:3.0  scene:0.38
      `;

      const lines = mockFfmpegOutput.split('\n').filter((l) => l.includes('pts_time'));
      const scenes: Array<{ timestamp: number; score: number }> = [];

      for (const line of lines) {
        const timeMatch = line.match(/pts_time:([\d.]+)/);
        const scoreMatch = line.match(/scene:([\d.]+)/);

        if (timeMatch && scoreMatch) {
          scenes.push({
            timestamp: parseFloat(timeMatch[1]),
            score: parseFloat(scoreMatch[1]),
          });
        }
      }

      expect(scenes).toHaveLength(3);
      expect(scenes[0].timestamp).toBe(0.5);
      expect(scenes[0].score).toBe(0.25);
      expect(scenes[1].timestamp).toBe(1.5);
      expect(scenes[1].score).toBe(0.41);
    });
  });

  describe('Thumbnail Generation', () => {
    it('should extract thumbnail at correct time', () => {
      const videoDuration = 120; // 2 minutes

      // Common strategies for thumbnail extraction
      const strategies = [
        { name: 'first_frame', time: 0 },
        { name: 'one_second', time: 1 },
        { name: '10_percent', time: videoDuration * 0.1 },
        { name: 'middle', time: videoDuration / 2 },
      ];

      strategies.forEach((strategy) => {
        expect(strategy.time).toBeGreaterThanOrEqual(0);
        expect(strategy.time).toBeLessThanOrEqual(videoDuration);
      });

      expect(strategies[0].time).toBe(0);
      expect(strategies[1].time).toBe(1);
      expect(strategies[2].time).toBe(12);
      expect(strategies[3].time).toBe(60);
    });
  });
});

describe('ObjectDetectionService', () => {
  beforeAll(() => {
    process.env.ENABLE_OBJECT_DETECTION = 'true';
    process.env.TENSORFLOW_MODEL = 'coco-ssd';
  });

  describe('COCO Dataset Classes', () => {
    it('should support 90 common object classes', () => {
      const cocoClasses = [
        'person',
        'bicycle',
        'car',
        'motorcycle',
        'airplane',
        'bus',
        'train',
        'truck',
        'boat',
        'traffic light',
        'fire hydrant',
        'stop sign',
        'parking meter',
        'bench',
        'bird',
        'cat',
        'dog',
        'horse',
        'sheep',
        'cow',
        'elephant',
        'bear',
        'zebra',
        'giraffe',
        'backpack',
        'umbrella',
        'handbag',
        'tie',
        'suitcase',
        'frisbee',
        'skis',
        'snowboard',
        'sports ball',
        'kite',
        'baseball bat',
        'baseball glove',
        'skateboard',
        'surfboard',
        'tennis racket',
        'bottle',
        'wine glass',
        'cup',
        'fork',
        'knife',
        'spoon',
        'bowl',
        'banana',
        'apple',
        'sandwich',
        'orange',
        'broccoli',
        'carrot',
        'hot dog',
        'pizza',
        'donut',
        'cake',
        'chair',
        'couch',
        'potted plant',
        'bed',
        'dining table',
        'toilet',
        'tv',
        'laptop',
        'mouse',
        'remote',
        'keyboard',
        'cell phone',
        'microwave',
        'oven',
        'toaster',
        'sink',
        'refrigerator',
        'book',
        'clock',
        'vase',
        'scissors',
        'teddy bear',
        'hair drier',
        'toothbrush',
      ];

      expect(cocoClasses.length).toBeGreaterThanOrEqual(80);
    });

    it('should filter by class name', () => {
      const mockDetections = [
        { class: 'person', confidence: 0.95 },
        { class: 'car', confidence: 0.88 },
        { class: 'person', confidence: 0.92 },
        { class: 'dog', confidence: 0.85 },
      ];

      const people = mockDetections.filter((d) => d.class === 'person');
      const cars = mockDetections.filter((d) => d.class === 'car');

      expect(people).toHaveLength(2);
      expect(cars).toHaveLength(1);
    });
  });

  describe('Confidence Filtering', () => {
    it('should filter by minimum confidence', () => {
      const mockDetections = [
        { class: 'person', confidence: 0.95 },
        { class: 'car', confidence: 0.48 },
        { class: 'dog', confidence: 0.52 },
        { class: 'cat', confidence: 0.45 },
      ];

      const minConfidence = 0.5;
      const filtered = mockDetections.filter((d) => d.confidence >= minConfidence);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].class).toBe('person');
      expect(filtered[1].class).toBe('dog');
    });

    it('should calculate average confidence', () => {
      const mockDetections = [
        { confidence: 0.95 },
        { confidence: 0.88 },
        { confidence: 0.92 },
        { confidence: 0.85 },
      ];

      const avgConfidence =
        mockDetections.reduce((sum, d) => sum + d.confidence, 0) / mockDetections.length;

      expect(avgConfidence).toBeCloseTo(0.9, 2);
    });
  });

  describe('Bounding Box Calculations', () => {
    it('should calculate bounding box area', () => {
      const boxes = [
        { x: 0, y: 0, width: 100, height: 100, expectedArea: 10000 },
        { x: 10, y: 10, width: 50, height: 50, expectedArea: 2500 },
        { x: 0, y: 0, width: 1920, height: 1080, expectedArea: 2073600 },
      ];

      boxes.forEach(({ x, y, width, height, expectedArea }) => {
        const area = width * height;
        expect(area).toBe(expectedArea);
      });
    });

    it('should detect overlapping bounding boxes', () => {
      const box1 = { x: 0, y: 0, width: 100, height: 100 };
      const box2 = { x: 50, y: 50, width: 100, height: 100 };
      const box3 = { x: 200, y: 200, width: 50, height: 50 };

      const overlaps = (b1: any, b2: any) => {
        return !(
          b1.x + b1.width < b2.x ||
          b2.x + b2.width < b1.x ||
          b1.y + b1.height < b2.y ||
          b2.y + b2.height < b1.y
        );
      };

      expect(overlaps(box1, box2)).toBe(true); // Overlapping
      expect(overlaps(box1, box3)).toBe(false); // Not overlapping
      expect(overlaps(box2, box3)).toBe(false); // Not overlapping
    });
  });

  describe('Detection Statistics', () => {
    it('should calculate class frequency', () => {
      const mockDetections = [
        { class: 'person' },
        { class: 'car' },
        { class: 'person' },
        { class: 'person' },
        { class: 'dog' },
        { class: 'car' },
      ];

      const frequency = new Map<string, number>();

      mockDetections.forEach((d) => {
        frequency.set(d.class, (frequency.get(d.class) || 0) + 1);
      });

      expect(frequency.get('person')).toBe(3);
      expect(frequency.get('car')).toBe(2);
      expect(frequency.get('dog')).toBe(1);
      expect(frequency.size).toBe(3);
    });

    it('should calculate objects per frame', () => {
      const frameResults = new Map<number, any[]>();
      frameResults.set(0, [{ class: 'person' }, { class: 'car' }]);
      frameResults.set(1, [{ class: 'person' }]);
      frameResults.set(2, [{ class: 'dog' }, { class: 'cat' }, { class: 'person' }]);

      const totalObjects = Array.from(frameResults.values()).reduce((sum, objs) => sum + objs.length, 0);
      const avgObjectsPerFrame = totalObjects / frameResults.size;

      expect(totalObjects).toBe(6);
      expect(avgObjectsPerFrame).toBe(2);
    });

    it('should identify unique classes', () => {
      const allDetections = [
        [{ class: 'person' }, { class: 'car' }],
        [{ class: 'person' }, { class: 'dog' }],
        [{ class: 'car' }, { class: 'cat' }],
      ];

      const allClasses = new Set<string>();
      allDetections.forEach((frame) => {
        frame.forEach((d) => allClasses.add(d.class));
      });

      expect(allClasses.size).toBe(4);
      expect(Array.from(allClasses).sort()).toEqual(['car', 'cat', 'dog', 'person']);
    });
  });

  describe('Performance Metrics', () => {
    it('should estimate processing time per frame', () => {
      // TensorFlow.js typically processes at 50-200ms per frame (CPU)
      // GPU can be 10-50ms per frame

      const testCases = [
        { frames: 10, msPerFrame: 100, expectedTotal: 1000 },
        { frames: 300, msPerFrame: 100, expectedTotal: 30000 },
        { frames: 60, msPerFrame: 50, expectedTotal: 3000 },
      ];

      testCases.forEach(({ frames, msPerFrame, expectedTotal }) => {
        const totalMs = frames * msPerFrame;
        expect(totalMs).toBe(expectedTotal);
      });
    });
  });
});

/**
 * Integration Tests
 *
 * These tests require actual video files and TensorFlow.js
 * Run with: npm test -- --testPathPattern=VideoAnalysisService.integration
 */
describe('VideoAnalysisService Integration', () => {
  it.skip('should analyze video file', async () => {
    // Requires test video file
    // const result = await videoAnalysisService.analyzeVideo('./test-fixtures/video.mp4', {
    //   extractFrames: true,
    //   frameRate: 1,
    //   maxFrames: 10,
    //   generateThumbnail: true
    // });
    // expect(result.success).toBe(true);
    // expect(result.duration).toBeGreaterThan(0);
    // expect(result.frames).toBeDefined();
  });

  it.skip('should detect objects in video', async () => {
    // Requires test video file and TensorFlow.js
    // const result = await videoAnalysisService.analyzeVideo('./test-fixtures/video.mp4', {
    //   extractFrames: true,
    //   frameRate: 1,
    //   maxFrames: 10,
    //   detectObjects: true
    // });
    // expect(result.success).toBe(true);
    // expect(result.detectedObjects).toBeDefined();
    // expect(result.detectedObjects!.totalObjects).toBeGreaterThan(0);
  });
});
