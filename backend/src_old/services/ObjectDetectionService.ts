/**
 * ObjectDetectionService
 *
 * Performs object detection on images/video frames using TensorFlow.js
 * with the COCO-SSD model for real-time object detection.
 *
 * Detects 90 common object classes from the COCO dataset:
 * - People, vehicles, animals
 * - Common objects, furniture, electronics
 * - Food items, sports equipment, etc.
 *
 * Note: This service requires TensorFlow.js Node bindings to be installed:
 * npm install @tensorflow/tfjs-node @tensorflow-models/coco-ssd
 *
 * For production use, consider GPU acceleration with @tensorflow/tfjs-node-gpu
 */

export interface DetectedObject {
  class: string; // Object class (e.g., 'person', 'car', 'dog')
  confidence: number; // 0.0 to 1.0
  bbox: {
    x: number; // Top-left x coordinate
    y: number; // Top-left y coordinate
    width: number;
    height: number;
  };
}

export interface ObjectDetectionResult {
  success: boolean;
  objects: DetectedObject[];
  totalObjects: number;
  uniqueClasses: string[];
  processingTime: number;
  error?: string;
}

export class ObjectDetectionService {
  private model: any = null;
  private isInitialized: boolean = false;
  private enableObjectDetection: boolean;
  private modelName: string;
  private minConfidence: number;

  constructor() {
    this.enableObjectDetection = process.env.ENABLE_OBJECT_DETECTION === 'true';
    this.modelName = process.env.TENSORFLOW_MODEL || 'coco-ssd';
    this.minConfidence = 0.5; // Minimum confidence threshold

    if (this.enableObjectDetection) {
      console.log('✓ ObjectDetectionService configured (lazy initialization)');
      console.log(`  Model: ${this.modelName}, Min confidence: ${this.minConfidence}`);
    } else {
      console.log('⚠ ObjectDetectionService disabled (set ENABLE_OBJECT_DETECTION=true)');
    }
  }

  /**
   * Initialize TensorFlow model (lazy loading)
   */
  private async initializeModel(): Promise<void> {
    if (this.isInitialized || !this.enableObjectDetection) {
      return;
    }

    try {
      console.log('Initializing TensorFlow.js model...');

      // Dynamically import TensorFlow modules
      const tf = await import('@tensorflow/tfjs-node');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');

      // Load COCO-SSD model
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Faster but less accurate
        // Use 'mobilenet_v2' for better accuracy but slower inference
      });

      this.isInitialized = true;
      console.log('✓ TensorFlow.js model loaded successfully');
    } catch (error: any) {
      console.error(`✗ Failed to initialize TensorFlow model: ${error.message}`);
      console.error('  Make sure to install: npm install @tensorflow/tfjs-node @tensorflow-models/coco-ssd');
      throw new Error('TensorFlow model initialization failed');
    }
  }

  /**
   * Detect objects in an image file
   */
  async detectObjects(imagePath: string): Promise<ObjectDetectionResult> {
    const startTime = Date.now();

    try {
      if (!this.enableObjectDetection) {
        return {
          success: false,
          objects: [],
          totalObjects: 0,
          uniqueClasses: [],
          processingTime: Date.now() - startTime,
          error: 'Object detection is disabled',
        };
      }

      // Initialize model if needed
      await this.initializeModel();

      if (!this.model) {
        throw new Error('TensorFlow model not loaded');
      }

      console.log(`Detecting objects in: ${imagePath}`);

      // Import TensorFlow for image processing
      const tf = await import('@tensorflow/tfjs-node');
      const fs = await import('fs');

      // Read and decode image
      const imageBuffer = fs.readFileSync(imagePath);
      const imageTensor = tf.node.decodeImage(imageBuffer, 3); // 3 channels (RGB)

      // Run object detection
      const predictions = await this.model.detect(imageTensor);

      // Clean up tensor
      imageTensor.dispose();

      // Filter by confidence threshold
      const objects: DetectedObject[] = predictions
        .filter((pred: any) => pred.score >= this.minConfidence)
        .map((pred: any) => ({
          class: pred.class,
          confidence: pred.score,
          bbox: {
            x: pred.bbox[0],
            y: pred.bbox[1],
            width: pred.bbox[2],
            height: pred.bbox[3],
          },
        }));

      // Get unique classes
      const uniqueClasses = [...new Set(objects.map(obj => obj.class))];

      const processingTime = Date.now() - startTime;

      console.log(`✓ Detected ${objects.length} objects in ${processingTime}ms`);
      console.log(`  Classes found: ${uniqueClasses.join(', ')}`);

      return {
        success: true,
        objects,
        totalObjects: objects.length,
        uniqueClasses,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`✗ Object detection failed: ${error.message}`);

      return {
        success: false,
        objects: [],
        totalObjects: 0,
        uniqueClasses: [],
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * Detect objects in multiple images (batch processing)
   */
  async detectObjectsBatch(imagePaths: string[]): Promise<Map<string, ObjectDetectionResult>> {
    const results = new Map<string, ObjectDetectionResult>();

    for (const imagePath of imagePaths) {
      const result = await this.detectObjects(imagePath);
      results.set(imagePath, result);
    }

    return results;
  }

  /**
   * Get summary statistics across multiple detection results
   */
  getDetectionSummary(results: ObjectDetectionResult[]): {
    totalObjects: number;
    totalFrames: number;
    avgObjectsPerFrame: number;
    allClasses: string[];
    classFrequency: Map<string, number>;
  } {
    let totalObjects = 0;
    const classFrequency = new Map<string, number>();

    for (const result of results) {
      if (result.success) {
        totalObjects += result.totalObjects;

        for (const obj of result.objects) {
          classFrequency.set(obj.class, (classFrequency.get(obj.class) || 0) + 1);
        }
      }
    }

    const allClasses = Array.from(classFrequency.keys()).sort();
    const avgObjectsPerFrame = results.length > 0 ? totalObjects / results.length : 0;

    return {
      totalObjects,
      totalFrames: results.length,
      avgObjectsPerFrame,
      allClasses,
      classFrequency,
    };
  }

  /**
   * Filter objects by class name
   */
  filterByClass(result: ObjectDetectionResult, className: string): DetectedObject[] {
    return result.objects.filter(obj => obj.class.toLowerCase() === className.toLowerCase());
  }

  /**
   * Filter objects by confidence threshold
   */
  filterByConfidence(result: ObjectDetectionResult, minConfidence: number): DetectedObject[] {
    return result.objects.filter(obj => obj.confidence >= minConfidence);
  }

  /**
   * Get supported object classes (COCO dataset)
   */
  getSupportedClasses(): string[] {
    return [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
      'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
      'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
      'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
      'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
      'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
      'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
      'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
      'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
      'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
    ];
  }

  /**
   * Check if model is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }

  /**
   * Cleanup and dispose of model resources
   */
  async dispose(): Promise<void> {
    if (this.model) {
      // TensorFlow.js models don't have explicit dispose method
      // Just clear the reference
      this.model = null;
      this.isInitialized = false;
      console.log('✓ ObjectDetectionService disposed');
    }
  }
}

// Export singleton instance
export const objectDetectionService = new ObjectDetectionService();
