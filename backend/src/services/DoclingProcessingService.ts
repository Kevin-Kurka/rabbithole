import axios from 'axios';
import { createReadStream } from 'fs';
import FormData from 'form-data';

/**
 * DoclingProcessingService
 *
 * Handles document processing using Docling API for advanced PDF/document parsing.
 * Replaces pdf-parse to avoid DOM dependency issues and gain superior capabilities:
 * - Table extraction with structure preservation
 * - Figure/image extraction
 * - Layout analysis
 * - Support for 5x more formats (PDF, DOCX, PPTX, HTML, etc.)
 * - No browser dependencies (DOMMatrix issue resolved)
 *
 * Docling API: https://docling-project.github.io/docling/
 */

export interface DoclingTable {
  page: number;
  bbox: {
    l: number;
    t: number;
    r: number;
    b: number;
  };
  rows: string[][];
  caption?: string;
}

export interface DoclingFigure {
  page: number;
  bbox: {
    l: number;
    t: number;
    r: number;
    b: number;
  };
  caption?: string;
  image_data?: string; // Base64 encoded image
}

export interface DoclingSection {
  heading: string;
  level: number;
  content: string;
}

export interface DoclingProcessingResult {
  success: boolean;
  text: string;
  markdown?: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  };
  tables: DoclingTable[];
  figures: DoclingFigure[];
  sections: DoclingSection[];
  processingTime: number;
  error?: string;
}

export class DoclingProcessingService {
  private doclingUrl: string;
  private timeout: number;

  constructor() {
    this.doclingUrl = process.env.DOCLING_URL || 'http://localhost:5001';
    this.timeout = parseInt(process.env.DOCLING_TIMEOUT || '60000', 10); // 60 seconds default
    console.log(`✓ DoclingProcessingService initialized at ${this.doclingUrl}`);
  }

  /**
   * Process a document file using Docling API
   *
   * @param filePath - Path to the document file
   * @param options - Processing options
   * @returns Promise<DoclingProcessingResult>
   */
  async processDocument(
    filePath: string,
    options: {
      extractTables?: boolean;
      extractFigures?: boolean;
      extractSections?: boolean;
      outputFormat?: 'text' | 'markdown' | 'json';
    } = {}
  ): Promise<DoclingProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`Processing document with Docling: ${filePath}`);

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', createReadStream(filePath));
      formData.append('extract_tables', String(options.extractTables !== false));
      formData.append('extract_figures', String(options.extractFigures !== false));
      formData.append('extract_sections', String(options.extractSections !== false));
      formData.append('output_format', options.outputFormat || 'markdown');

      // Send request to Docling API
      const response = await axios.post(`${this.doclingUrl}/api/v1/convert`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: this.timeout,
        maxContentLength: 100 * 1024 * 1024, // 100MB max
      });

      const processingTime = Date.now() - startTime;

      // Parse Docling response
      const result: DoclingProcessingResult = {
        success: true,
        text: response.data.text || '',
        markdown: response.data.markdown,
        pageCount: response.data.page_count || 0,
        metadata: {
          title: response.data.metadata?.title,
          author: response.data.metadata?.author,
          subject: response.data.metadata?.subject,
          creator: response.data.metadata?.creator,
          producer: response.data.metadata?.producer,
          creationDate: response.data.metadata?.creation_date,
          modificationDate: response.data.metadata?.modification_date,
        },
        tables: this.parseTables(response.data.tables || []),
        figures: this.parseFigures(response.data.figures || []),
        sections: this.parseSections(response.data.sections || []),
        processingTime,
      };

      console.log(
        `✓ Document processed in ${processingTime}ms ` +
        `(pages: ${result.pageCount}, tables: ${result.tables.length}, figures: ${result.figures.length})`
      );

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      console.error(`✗ Docling processing failed: ${error.message}`);

      // Handle Docling API errors
      if (error.response) {
        return {
          success: false,
          text: '',
          pageCount: 0,
          metadata: {},
          tables: [],
          figures: [],
          sections: [],
          processingTime,
          error: `Docling API error: ${error.response.status} - ${error.response.data?.message || error.message}`,
        };
      }

      // Handle network/timeout errors
      return {
        success: false,
        text: '',
        pageCount: 0,
        metadata: {},
        tables: [],
        figures: [],
        sections: [],
        processingTime,
        error: `Processing failed: ${error.message}`,
      };
    }
  }

  /**
   * Extract text content only (fastest operation)
   */
  async extractText(filePath: string): Promise<string> {
    const result = await this.processDocument(filePath, {
      extractTables: false,
      extractFigures: false,
      extractSections: false,
      outputFormat: 'text',
    });

    if (!result.success) {
      throw new Error(result.error || 'Text extraction failed');
    }

    return result.text;
  }

  /**
   * Extract markdown with preserved formatting
   */
  async extractMarkdown(filePath: string): Promise<string> {
    const result = await this.processDocument(filePath, {
      extractTables: true,
      extractFigures: false,
      extractSections: true,
      outputFormat: 'markdown',
    });

    if (!result.success) {
      throw new Error(result.error || 'Markdown extraction failed');
    }

    return result.markdown || result.text;
  }

  /**
   * Health check to verify Docling API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.doclingUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error: any) {
      console.error(`Docling health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Parse table data from Docling response
   */
  private parseTables(tablesData: any[]): DoclingTable[] {
    return tablesData.map((table) => ({
      page: table.page || 0,
      bbox: table.bbox || { l: 0, t: 0, r: 0, b: 0 },
      rows: table.rows || [],
      caption: table.caption,
    }));
  }

  /**
   * Parse figure data from Docling response
   */
  private parseFigures(figuresData: any[]): DoclingFigure[] {
    return figuresData.map((figure) => ({
      page: figure.page || 0,
      bbox: figure.bbox || { l: 0, t: 0, r: 0, b: 0 },
      caption: figure.caption,
      image_data: figure.image_data,
    }));
  }

  /**
   * Parse section data from Docling response
   */
  private parseSections(sectionsData: any[]): DoclingSection[] {
    return sectionsData.map((section) => ({
      heading: section.heading || '',
      level: section.level || 1,
      content: section.content || '',
    }));
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats(): string[] {
    return [
      'pdf',
      'docx',
      'doc',
      'pptx',
      'ppt',
      'xlsx',
      'xls',
      'html',
      'htm',
      'txt',
      'md',
      'rtf',
      'odt',
      'odp',
      'ods',
    ];
  }

  /**
   * Check if file format is supported
   */
  isSupportedFormat(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return this.getSupportedFormats().includes(ext);
  }
}

// Export singleton instance
export const doclingService = new DoclingProcessingService();
