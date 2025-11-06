import {
  AlertCircle, Archive, Award, BarChart, BookOpen, Brain, Briefcase, Building,
  Calendar, Camera, CheckCircle, ChevronRight, Clock, Code, Coins, Copy,
  Database, DollarSign, Edit3, FileText, Film, Flag, Folder, Gavel, GitBranch,
  Globe, GraduationCap, Grid, HardDrive, Hash, Headphones, Heart, HelpCircle,
  Home, Image, Info, Key, Landmark, Layers, LayoutGrid, Link, List, Lock,
  MapPin, Megaphone, MessageCircle, Mic, Microscope, Monitor, Mountain, Music,
  Newspaper, Package, Palette, PenTool, Phone, PieChart, PlayCircle, Radio,
  Receipt, Scale, Search, Settings, Shield, ShoppingBag, Sparkles, Star,
  Target, Terminal, Thermometer, Tool, TrendingUp, Tv, Type, Upload, User,
  UserCheck, Users, Video, Volume2, Wifi, Wrench, Zap, Activity, Anchor,
  Award as Trophy, Box, Cpu, Crosshair, Download, FileCode, GitCommit,
  GitMerge, GitPullRequest, Inbox, Layers as Stack, LifeBuoy, Mail, Map,
  Navigation, Percent, Printer, RefreshCw, Repeat, RotateCw, Rss, Save,
  Send, Server, Share2, Shuffle, Sidebar, Sliders, Smartphone, Speaker,
  Square, Tag, Trash2, TrendingDown, Triangle, Truck, Umbrella, Unlock,
  UserPlus, VolumeX, Watch, Wifi as WifiOff, Wind, X, XCircle, ZapOff,
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, BellOff,
  ChevronDown, ChevronLeft, ChevronUp, Circle, Cloud, CloudOff, Command,
  Copy as Clipboard, CornerDownLeft, CornerDownRight, CornerLeftDown,
  CornerLeftUp, CornerRightDown, CornerRightUp, CornerUpLeft, CornerUpRight,
  CreditCard, Crop, Delete, Disc, DivideCircle, DivideSquare, Divide,
  DollarSign as Dollar, DownloadCloud, Droplet, Edit, Edit2, ExternalLink,
  EyeOff, Eye, Facebook, FastForward, Feather, File, FileMinus, FilePlus,
  Filter, Folder as FolderOpen, FolderMinus, FolderPlus, Framer, Frown,
  Gift, Github, Gitlab, Grid as Grid3x3, HardDrive as HardDisk, Hash as Hashtag,
  HeadphonesIcon, Heart as HeartIcon, HelpCircle as Help, Home as House,
  Image as ImageIcon, Info as InfoIcon, Instagram, Italic, Key as KeyIcon,
  Layers as LayersIcon, Layout, LifeBuoy as Lifebuoy, Link2, Link as LinkIcon,
  List as ListIcon, Loader, Lock as LockIcon, LogIn, LogOut, Mail as MailIcon,
  Map as MapIcon, Maximize, Maximize2, Menu, MessageCircle as Message,
  MessageSquare, Mic as MicIcon, MicOff, Minimize, Minimize2, MinusCircle,
  MinusSquare, Minus, Monitor as MonitorIcon, Moon, MoreHorizontal, MoreVertical as More,
  Move, Music as MusicIcon, Navigation2, Navigation as NavigationIcon,
  Octagon, Package as PackageIcon, Paperclip, Pause, PauseCircle, Percent as PercentIcon,
  Phone as PhoneIcon, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed,
  PhoneOff, PhoneOutgoing, PieChart as PieChartIcon, Play, PlayCircle as PlayIcon,
  PlusCircle, PlusSquare, Plus, Pocket, Power, Printer as PrinterIcon,
  Radio as RadioIcon, RefreshCcw, RefreshCw as Refresh, Repeat as RepeatIcon,
  Rewind, RotateCcw, RotateCw as Rotate, Rss as RssIcon, Save as SaveIcon,
  Scissors, Search as SearchIcon, Send as SendIcon, Server as ServerIcon,
  Settings as SettingsIcon, Share, Share2 as ShareIcon, ShieldOff, Shield as ShieldIcon,
  ShoppingBag as ShoppingBagIcon, ShoppingCart, Shuffle as ShuffleIcon,
  Sidebar as SidebarIcon, SkipBack, SkipForward, Slash, Sliders as SlidersIcon,
  Smartphone as SmartphoneIcon, Smile, Speaker as SpeakerIcon, Square as SquareIcon,
  Star as StarIcon, StopCircle, Sun, Sunrise, Sunset, Tablet, Tag as TagIcon,
  Target as TargetIcon, Terminal as TerminalIcon, Thermometer as ThermometerIcon,
  ThumbsDown, ThumbsUp, ToggleLeft, ToggleRight, Trash, Trash2 as TrashIcon,
  TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon,
  Triangle as TriangleIcon, Truck as TruckIcon, Tv as TvIcon, Twitter,
  Type as TypeIcon, Umbrella as UmbrellaIcon, Underline, Unlock as UnlockIcon,
  Upload as UploadIcon, UploadCloud, User as UserIcon, UserCheck as UserCheckIcon,
  UserMinus, UserPlus as UserPlusIcon, UserX, Users as UsersIcon,
  Video as VideoIcon, VideoOff, Voicemail, Volume, Volume1, Volume2 as VolumeIcon,
  VolumeX as VolumeXIcon, Watch as WatchIcon, WifiOff as WifiOffIcon,
  Wifi as WifiIcon, Wind as WindIcon, XCircle as XCircleIcon, X as XIcon,
  Youtube, ZapOff as ZapOffIcon, Zap as ZapIcon, ZoomIn, ZoomOut, LucideIcon
} from 'lucide-react';

// Type for temporal properties
export interface TemporalProps {
  startDate?: string;
  endDate?: string;
  birthDate?: string;
  deathDate?: string;
  foundingDate?: string;
  dissolutionDate?: string;
  dateCreated?: string;
  dateModified?: string;
  datePublished?: string;
  validFrom?: string;
  validThrough?: string;
  temporalCoverage?: string;
  duration?: string;
  activeYears?: { start: string; end?: string };
  lifespan?: { start: string; end?: string };
}

// Type definition structure
export interface SchemaType {
  name: string;
  label: string;
  parent?: string;
  icon: LucideIcon;
  description: string;
  properties: string[];
  temporalProperties?: (keyof TemporalProps)[];
  color?: string;
}

// Core Schema.org Types with Inheritance
export const SCHEMA_TYPES: Record<string, SchemaType> = {
  // Root
  'Thing': {
    name: 'Thing',
    label: 'Thing',
    icon: Circle,
    description: 'The most generic type of item',
    properties: ['name', 'description', 'url', 'identifier', 'alternateName']
  },

  // Creative Works
  'CreativeWork': {
    name: 'CreativeWork',
    label: 'Creative Work',
    parent: 'Thing',
    icon: FileText,
    description: 'Creative work including books, movies, photographs, software programs',
    properties: ['author', 'dateCreated', 'dateModified', 'datePublished', 'headline', 'keywords'],
    temporalProperties: ['dateCreated', 'dateModified', 'datePublished']
  },
  'Article': {
    name: 'Article',
    label: 'Article',
    parent: 'CreativeWork',
    icon: Newspaper,
    description: 'An article, such as news, scholarly, or blog article',
    properties: ['articleBody', 'articleSection', 'wordCount']
  },
  'Book': {
    name: 'Book',
    label: 'Book',
    parent: 'CreativeWork',
    icon: BookOpen,
    description: 'A book',
    properties: ['isbn', 'numberOfPages', 'bookFormat', 'illustrator']
  },
  'Dataset': {
    name: 'Dataset',
    label: 'Dataset',
    parent: 'CreativeWork',
    icon: Database,
    description: 'A body of structured information',
    properties: ['distribution', 'measurementTechnique', 'variableMeasured']
  },
  'Report': {
    name: 'Report',
    label: 'Report',
    parent: 'CreativeWork',
    icon: FileText,
    description: 'A report document',
    properties: ['reportNumber', 'reportType']
  },
  'ScholarlyArticle': {
    name: 'ScholarlyArticle',
    label: 'Scholarly Article',
    parent: 'Article',
    icon: GraduationCap,
    description: 'A scholarly article',
    properties: ['citation', 'peerReviewed']
  },
  'Legislation': {
    name: 'Legislation',
    label: 'Legislation',
    parent: 'CreativeWork',
    icon: Gavel,
    description: 'Legal legislation',
    properties: ['legislationIdentifier', 'legislationJurisdiction', 'legislationDate'],
    temporalProperties: ['legislationDate', 'validFrom', 'validThrough']
  },
  'LegislationObject': {
    name: 'LegislationObject',
    label: 'Legislation Object',
    parent: 'Legislation',
    icon: Scale,
    description: 'Specific legislation object',
    properties: ['legislationType', 'legislationPassedBy']
  },
  'MediaObject': {
    name: 'MediaObject',
    label: 'Media',
    parent: 'CreativeWork',
    icon: Image,
    description: 'Media object such as image, video, or audio',
    properties: ['contentUrl', 'contentSize', 'encodingFormat', 'duration', 'height', 'width']
  },
  'AudioObject': {
    name: 'AudioObject',
    label: 'Audio',
    parent: 'MediaObject',
    icon: Headphones,
    description: 'Audio file',
    properties: ['transcript', 'duration', 'bitrate']
  },
  'ImageObject': {
    name: 'ImageObject',
    label: 'Image',
    parent: 'MediaObject',
    icon: Camera,
    description: 'An image file',
    properties: ['caption', 'exifData', 'representativeOfPage']
  },
  'VideoObject': {
    name: 'VideoObject',
    label: 'Video',
    parent: 'MediaObject',
    icon: Video,
    description: 'A video file',
    properties: ['videoFrameSize', 'videoQuality', 'transcript', 'duration']
  },
  'Photograph': {
    name: 'Photograph',
    label: 'Photograph',
    parent: 'ImageObject',
    icon: Camera,
    description: 'A photograph',
    properties: ['photographer', 'photoLocation', 'photoDate'],
    temporalProperties: ['photoDate']
  },

  // Events
  'Event': {
    name: 'Event',
    label: 'Event',
    parent: 'Thing',
    icon: Calendar,
    description: 'An event happening at a certain time and location',
    properties: ['startDate', 'endDate', 'location', 'organizer', 'performer', 'eventStatus'],
    temporalProperties: ['startDate', 'endDate', 'duration']
  },
  'PublicationEvent': {
    name: 'PublicationEvent',
    label: 'Publication Event',
    parent: 'Event',
    icon: Newspaper,
    description: 'A publication event',
    properties: ['publishedBy', 'publishedOn'],
    temporalProperties: ['startDate']
  },

  // Intangibles
  'Intangible': {
    name: 'Intangible',
    label: 'Intangible',
    parent: 'Thing',
    icon: Sparkles,
    description: 'Intangible item such as service, quantity, structured value',
    properties: []
  },
  'StructuredValue': {
    name: 'StructuredValue',
    label: 'Structured Value',
    parent: 'Intangible',
    icon: Grid,
    description: 'Structured values',
    properties: []
  },
  'PropertyValue': {
    name: 'PropertyValue',
    label: 'Property Value',
    parent: 'StructuredValue',
    icon: Tag,
    description: 'A property-value pair',
    properties: ['propertyID', 'value', 'unitCode', 'unitText']
  },
  'QuantitativeValue': {
    name: 'QuantitativeValue',
    label: 'Quantitative Value',
    parent: 'StructuredValue',
    icon: Hash,
    description: 'A quantitative value or measurement',
    properties: ['value', 'unitCode', 'unitText', 'minValue', 'maxValue']
  },

  // Organizations
  'Organization': {
    name: 'Organization',
    label: 'Organization',
    parent: 'Thing',
    icon: Building,
    description: 'An organization such as company, NGO, club',
    properties: ['foundingDate', 'dissolutionDate', 'founder', 'location', 'member', 'memberOf'],
    temporalProperties: ['foundingDate', 'dissolutionDate']
  },
  'Corporation': {
    name: 'Corporation',
    label: 'Corporation',
    parent: 'Organization',
    icon: Briefcase,
    description: 'A business corporation',
    properties: ['tickerSymbol', 'leiCode']
  },
  'GovernmentOrganization': {
    name: 'GovernmentOrganization',
    label: 'Government Organization',
    parent: 'Organization',
    icon: Landmark,
    description: 'A governmental organization',
    properties: ['jurisdiction', 'serviceArea']
  },
  'EducationalOrganization': {
    name: 'EducationalOrganization',
    label: 'Educational Organization',
    parent: 'Organization',
    icon: GraduationCap,
    description: 'An educational organization',
    properties: ['alumni', 'courses', 'credential']
  },
  'MedicalOrganization': {
    name: 'MedicalOrganization',
    label: 'Medical Organization',
    parent: 'Organization',
    icon: Heart,
    description: 'A medical organization',
    properties: ['medicalSpecialty', 'healthPlanNetworkId']
  },
  'NewsMediaOrganization': {
    name: 'NewsMediaOrganization',
    label: 'News Media',
    parent: 'Organization',
    icon: Newspaper,
    description: 'A news media organization',
    properties: ['masthead', 'missionCoveragePrioritiesPolicy', 'verificationFactCheckingPolicy']
  },
  'NGO': {
    name: 'NGO',
    label: 'NGO',
    parent: 'Organization',
    icon: Heart,
    description: 'Non-governmental organization',
    properties: ['nonprofitStatus', 'fundingSource']
  },

  // People
  'Person': {
    name: 'Person',
    label: 'Person',
    parent: 'Thing',
    icon: User,
    description: 'A person (alive, dead, undead, fictional)',
    properties: ['birthDate', 'deathDate', 'birthPlace', 'deathPlace', 'nationality', 'jobTitle'],
    temporalProperties: ['birthDate', 'deathDate', 'lifespan']
  },
  'Patient': {
    name: 'Patient',
    label: 'Patient',
    parent: 'Person',
    icon: UserCheck,
    description: 'A patient in a medical context',
    properties: ['diagnosis', 'drug', 'healthCondition']
  },

  // Places
  'Place': {
    name: 'Place',
    label: 'Place',
    parent: 'Thing',
    icon: MapPin,
    description: 'Entities with physical extension',
    properties: ['address', 'geo', 'hasMap', 'latitude', 'longitude', 'maximumAttendeeCapacity']
  },
  'AdministrativeArea': {
    name: 'AdministrativeArea',
    label: 'Administrative Area',
    parent: 'Place',
    icon: Map,
    description: 'A geographical region under jurisdiction',
    properties: ['administrativeLevel', 'geoContains', 'geoWithin']
  },
  'CivicStructure': {
    name: 'CivicStructure',
    label: 'Civic Structure',
    parent: 'Place',
    icon: Building,
    description: 'A civic structure such as courthouse, hospital, church',
    properties: ['openingHours', 'accessibility']
  },
  'Courthouse': {
    name: 'Courthouse',
    label: 'Courthouse',
    parent: 'CivicStructure',
    icon: Gavel,
    description: 'A courthouse',
    properties: ['courtDistrict', 'courtJurisdiction']
  },
  'GovernmentBuilding': {
    name: 'GovernmentBuilding',
    label: 'Government Building',
    parent: 'CivicStructure',
    icon: Landmark,
    description: 'A government building',
    properties: ['governmentDepartment', 'publicAccess']
  },
  'Hospital': {
    name: 'Hospital',
    label: 'Hospital',
    parent: 'CivicStructure',
    icon: Heart,
    description: 'A hospital',
    properties: ['availableService', 'medicalSpecialty', 'hospitalAffiliation']
  },
  'PoliceStation': {
    name: 'PoliceStation',
    label: 'Police Station',
    parent: 'CivicStructure',
    icon: Shield,
    description: 'A police station',
    properties: ['serviceArea', 'jurisdiction']
  },
  'LandmarksOrHistoricalBuildings': {
    name: 'LandmarksOrHistoricalBuildings',
    label: 'Historical Landmark',
    parent: 'Place',
    icon: Landmark,
    description: 'Historical landmark or building',
    properties: ['historicalSignificance', 'yearBuilt', 'architecturalStyle'],
    temporalProperties: ['yearBuilt']
  },

  // Products
  'Product': {
    name: 'Product',
    label: 'Product',
    parent: 'Thing',
    icon: Package,
    description: 'Any offered product or service',
    properties: ['brand', 'manufacturer', 'model', 'productID', 'releaseDate', 'productionDate'],
    temporalProperties: ['releaseDate', 'productionDate']
  },

  // Actions
  'Action': {
    name: 'Action',
    label: 'Action',
    parent: 'Thing',
    icon: Zap,
    description: 'An action performed by agent and upon object',
    properties: ['agent', 'object', 'result', 'startTime', 'endTime', 'participant'],
    temporalProperties: ['startTime', 'endTime', 'duration']
  },
  'AssessAction': {
    name: 'AssessAction',
    label: 'Assessment',
    parent: 'Action',
    icon: CheckCircle,
    description: 'The act of assessing',
    properties: ['assessedValue', 'assessmentMethod']
  },
  'ChooseAction': {
    name: 'ChooseAction',
    label: 'Choice',
    parent: 'Action',
    icon: GitBranch,
    description: 'The act of choosing',
    properties: ['option', 'actionOption']
  },
  'VoteAction': {
    name: 'VoteAction',
    label: 'Vote',
    parent: 'ChooseAction',
    icon: CheckCircle,
    description: 'The act of voting',
    properties: ['candidate', 'votingMethod']
  },
  'SearchAction': {
    name: 'SearchAction',
    label: 'Search',
    parent: 'Action',
    icon: Search,
    description: 'The act of searching',
    properties: ['query', 'resultSet']
  },

  // Medical Entities
  'MedicalEntity': {
    name: 'MedicalEntity',
    label: 'Medical Entity',
    parent: 'Thing',
    icon: Heart,
    description: 'Medical entities',
    properties: ['medicineSystem', 'recognizingAuthority', 'study']
  },
  'MedicalCondition': {
    name: 'MedicalCondition',
    label: 'Medical Condition',
    parent: 'MedicalEntity',
    icon: Thermometer,
    description: 'Medical condition including diseases',
    properties: ['associatedAnatomy', 'cause', 'diagnosis', 'symptom', 'treatment']
  },
  'MedicalProcedure': {
    name: 'MedicalProcedure',
    label: 'Medical Procedure',
    parent: 'MedicalEntity',
    icon: Heart,
    description: 'Medical procedure',
    properties: ['bodyLocation', 'followup', 'preparation', 'procedureType']
  },
  'Drug': {
    name: 'Drug',
    label: 'Drug',
    parent: 'MedicalEntity',
    icon: Heart,
    description: 'A drug or medication',
    properties: ['activeIngredient', 'administrationRoute', 'dosageForm', 'indication']
  },
  'MedicalStudy': {
    name: 'MedicalStudy',
    label: 'Medical Study',
    parent: 'MedicalEntity',
    icon: Microscope,
    description: 'Medical study or trial',
    properties: ['healthCondition', 'sponsor', 'status', 'studyDesign', 'studySubject'],
    temporalProperties: ['startDate', 'endDate']
  },

  // Custom Legal Types
  'LegalCase': {
    name: 'LegalCase',
    label: 'Legal Case',
    parent: 'CreativeWork',
    icon: Gavel,
    description: 'A legal case or proceeding',
    properties: ['caseNumber', 'court', 'judge', 'plaintiff', 'defendant', 'verdict', 'dateFiled', 'dateDecided'],
    temporalProperties: ['dateFiled', 'dateDecided', 'duration']
  },
  'LegalBrief': {
    name: 'LegalBrief',
    label: 'Legal Brief',
    parent: 'CreativeWork',
    icon: FileText,
    description: 'A legal brief or memorandum',
    properties: ['filedBy', 'filedFor', 'briefType', 'dateFiled'],
    temporalProperties: ['dateFiled']
  },
  'Contract': {
    name: 'Contract',
    label: 'Contract',
    parent: 'CreativeWork',
    icon: FileText,
    description: 'A legal contract',
    properties: ['parties', 'executionDate', 'effectiveDate', 'expirationDate', 'jurisdiction'],
    temporalProperties: ['executionDate', 'effectiveDate', 'expirationDate', 'validFrom', 'validThrough']
  },
  'Patent': {
    name: 'Patent',
    label: 'Patent',
    parent: 'CreativeWork',
    icon: Award,
    description: 'A patent',
    properties: ['patentNumber', 'inventor', 'assignee', 'filingDate', 'grantDate', 'expirationDate'],
    temporalProperties: ['filingDate', 'grantDate', 'expirationDate']
  },
  'Testimony': {
    name: 'Testimony',
    label: 'Testimony',
    parent: 'CreativeWork',
    icon: Mic,
    description: 'Witness testimony or deposition',
    properties: ['witness', 'dateGiven', 'location', 'crossExamination', 'directExamination'],
    temporalProperties: ['dateGiven']
  },
  'Evidence': {
    name: 'Evidence',
    label: 'Evidence',
    parent: 'Thing',
    icon: Search,
    description: 'Legal or investigative evidence',
    properties: ['evidenceType', 'chainOfCustody', 'dateCollected', 'collectedBy', 'location'],
    temporalProperties: ['dateCollected']
  },
  'Exhibit': {
    name: 'Exhibit',
    label: 'Exhibit',
    parent: 'Evidence',
    icon: Archive,
    description: 'Legal exhibit',
    properties: ['exhibitNumber', 'introducedBy', 'dateIntroduced', 'admissibility'],
    temporalProperties: ['dateIntroduced']
  },

  // Custom Scientific Types
  'ScientificStudy': {
    name: 'ScientificStudy',
    label: 'Scientific Study',
    parent: 'CreativeWork',
    icon: Microscope,
    description: 'A scientific study or research',
    properties: ['hypothesis', 'methodology', 'results', 'conclusion', 'peerReviewed', 'fundedBy'],
    temporalProperties: ['startDate', 'endDate', 'datePublished']
  },
  'Experiment': {
    name: 'Experiment',
    label: 'Experiment',
    parent: 'ScientificStudy',
    icon: Microscope,
    description: 'A scientific experiment',
    properties: ['controlGroup', 'experimentalGroup', 'variables', 'apparatus', 'protocol'],
    temporalProperties: ['startDate', 'endDate']
  },
  'Theory': {
    name: 'Theory',
    label: 'Theory',
    parent: 'CreativeWork',
    icon: Brain,
    description: 'A scientific or explanatory theory',
    properties: ['proposedBy', 'dateProposed', 'supportingEvidence', 'contradictingEvidence', 'verificationStatus'],
    temporalProperties: ['dateProposed']
  },
  'Hypothesis': {
    name: 'Hypothesis',
    label: 'Hypothesis',
    parent: 'Theory',
    icon: HelpCircle,
    description: 'A scientific hypothesis',
    properties: ['nullHypothesis', 'alternativeHypothesis', 'testMethod', 'pValue']
  },
  'DataAnalysis': {
    name: 'DataAnalysis',
    label: 'Data Analysis',
    parent: 'CreativeWork',
    icon: BarChart,
    description: 'Statistical or data analysis',
    properties: ['dataSource', 'analysisMethod', 'statisticalTest', 'confidenceInterval', 'sampleSize'],
    temporalProperties: ['analysisDate']
  },
  'ForensicAnalysis': {
    name: 'ForensicAnalysis',
    label: 'Forensic Analysis',
    parent: 'DataAnalysis',
    icon: Search,
    description: 'Forensic analysis or examination',
    properties: ['examiner', 'laboratoryName', 'chainOfCustody', 'findings', 'methodology'],
    temporalProperties: ['examinationDate']
  },
  'BallisticsAnalysis': {
    name: 'BallisticsAnalysis',
    label: 'Ballistics Analysis',
    parent: 'ForensicAnalysis',
    icon: Crosshair,
    description: 'Ballistics analysis',
    properties: ['firearmType', 'caliber', 'trajectory', 'entryWound', 'exitWound', 'bulletRecovered']
  },
  'DNAAnalysis': {
    name: 'DNAAnalysis',
    label: 'DNA Analysis',
    parent: 'ForensicAnalysis',
    icon: Microscope,
    description: 'DNA analysis',
    properties: ['dnaProfile', 'matchProbability', 'locusAnalyzed', 'comparisonSample']
  },
  'ChemicalAnalysis': {
    name: 'ChemicalAnalysis',
    label: 'Chemical Analysis',
    parent: 'ForensicAnalysis',
    icon: Microscope,
    description: 'Chemical or toxicology analysis',
    properties: ['substanceDetected', 'concentration', 'detectionMethod', 'instrument']
  },

  // Investigation Types
  'Investigation': {
    name: 'Investigation',
    label: 'Investigation',
    parent: 'CreativeWork',
    icon: Search,
    description: 'An investigation or inquiry',
    properties: ['investigator', 'subject', 'startDate', 'endDate', 'status', 'findings'],
    temporalProperties: ['startDate', 'endDate', 'duration']
  },
  'CriminalInvestigation': {
    name: 'CriminalInvestigation',
    label: 'Criminal Investigation',
    parent: 'Investigation',
    icon: Shield,
    description: 'A criminal investigation',
    properties: ['leadDetective', 'suspect', 'victim', 'crime', 'jurisdiction']
  },
  'CommissionInquiry': {
    name: 'CommissionInquiry',
    label: 'Commission Inquiry',
    parent: 'Investigation',
    icon: Users,
    description: 'A commission or panel inquiry',
    properties: ['commissioners', 'mandate', 'recommendations', 'dissent']
  },

  // Temporal Entities
  'TemporalEntity': {
    name: 'TemporalEntity',
    label: 'Temporal Entity',
    parent: 'Thing',
    icon: Clock,
    description: 'An entity with temporal duration',
    properties: ['startDate', 'endDate', 'duration'],
    temporalProperties: ['startDate', 'endDate', 'duration']
  },
  'Tenure': {
    name: 'Tenure',
    label: 'Tenure',
    parent: 'TemporalEntity',
    icon: Clock,
    description: 'A period of holding office or position',
    properties: ['position', 'organization', 'predecessor', 'successor'],
    temporalProperties: ['startDate', 'endDate', 'duration']
  },
  'Term': {
    name: 'Term',
    label: 'Term',
    parent: 'TemporalEntity',
    icon: Calendar,
    description: 'A fixed period or term',
    properties: ['termNumber', 'termType'],
    temporalProperties: ['startDate', 'endDate']
  },
  'Era': {
    name: 'Era',
    label: 'Era',
    parent: 'TemporalEntity',
    icon: Clock,
    description: 'A historical era or period',
    properties: ['eraName', 'characteristics', 'keyEvents'],
    temporalProperties: ['startDate', 'endDate']
  },
  'Lifespan': {
    name: 'Lifespan',
    label: 'Lifespan',
    parent: 'TemporalEntity',
    icon: User,
    description: 'The lifespan of an entity',
    properties: ['entity', 'birthEvent', 'deathEvent'],
    temporalProperties: ['birthDate', 'deathDate', 'lifespan']
  }
};

// Function to get type with inheritance
export function getSchemaType(typeName: string): SchemaType {
  const type = SCHEMA_TYPES[typeName];
  if (!type) {
    return SCHEMA_TYPES['Thing']; // Fallback to root type
  }

  // If type has parent, merge properties
  if (type.parent) {
    const parentType = getSchemaType(type.parent);
    return {
      ...type,
      properties: [...new Set([...parentType.properties, ...type.properties])],
      temporalProperties: type.temporalProperties || parentType.temporalProperties,
      icon: type.icon || parentType.icon
    };
  }

  return type;
}

// Function to detect if a node has temporal properties
export function hasTemporalProperties(node: any): boolean {
  const props = node.props || {};
  const temporalKeys: (keyof TemporalProps)[] = [
    'startDate', 'endDate', 'birthDate', 'deathDate', 'foundingDate',
    'dissolutionDate', 'dateCreated', 'dateModified', 'datePublished',
    'validFrom', 'validThrough', 'temporalCoverage', 'duration',
    'activeYears', 'lifespan'
  ];

  return temporalKeys.some(key => props[key] !== undefined);
}

// Function to calculate temporal span for shadow rendering
export function calculateTemporalSpan(node: any): { start?: Date; end?: Date } | null {
  const props = node.props || {};

  // Priority order for start dates
  const startDate = props.birthDate || props.foundingDate || props.startDate ||
                    props.dateCreated || props.validFrom || props.activeYears?.start ||
                    props.lifespan?.start;

  // Priority order for end dates
  const endDate = props.deathDate || props.dissolutionDate || props.endDate ||
                 props.validThrough || props.activeYears?.end || props.lifespan?.end;

  if (!startDate) return null;

  return {
    start: new Date(startDate),
    end: endDate ? new Date(endDate) : undefined
  };
}

// Function to detect type from content
export function detectSchemaType(props: any, meta: any): string {
  // If schema_type is already set in meta, use it
  if (meta?.schema_type) {
    return meta.schema_type;
  }

  const title = props.title?.toLowerCase() || '';
  const description = props.description?.toLowerCase() || '';
  const content = `${title} ${description}`;

  // Legal document detection
  if (content.includes('case') || content.includes('v.') || content.includes('versus')) {
    return 'LegalCase';
  }
  if (content.includes('testimony') || content.includes('deposition') || content.includes('witness')) {
    return 'Testimony';
  }
  if (content.includes('evidence') || content.includes('exhibit')) {
    return content.includes('exhibit') ? 'Exhibit' : 'Evidence';
  }
  if (content.includes('contract') || content.includes('agreement')) {
    return 'Contract';
  }
  if (content.includes('patent')) {
    return 'Patent';
  }

  // Scientific detection
  if (content.includes('study') || content.includes('research')) {
    if (content.includes('medical') || content.includes('clinical')) {
      return 'MedicalStudy';
    }
    return 'ScientificStudy';
  }
  if (content.includes('experiment')) {
    return 'Experiment';
  }
  if (content.includes('theory')) {
    return 'Theory';
  }
  if (content.includes('hypothesis')) {
    return 'Hypothesis';
  }
  if (content.includes('ballistics')) {
    return 'BallisticsAnalysis';
  }
  if (content.includes('dna') || content.includes('genetic')) {
    return 'DNAAnalysis';
  }
  if (content.includes('forensic')) {
    return 'ForensicAnalysis';
  }
  if (content.includes('analysis') || content.includes('examination')) {
    return 'DataAnalysis';
  }

  // Investigation detection
  if (content.includes('investigation') || content.includes('inquiry')) {
    if (content.includes('commission') || content.includes('panel')) {
      return 'CommissionInquiry';
    }
    if (content.includes('criminal') || content.includes('police')) {
      return 'CriminalInvestigation';
    }
    return 'Investigation';
  }

  // Media detection
  if (content.includes('video') || content.includes('film') || content.includes('footage')) {
    return 'VideoObject';
  }
  if (content.includes('audio') || content.includes('recording') || content.includes('tape')) {
    return 'AudioObject';
  }
  if (content.includes('photo') || content.includes('image') || content.includes('picture')) {
    return 'Photograph';
  }

  // Document detection
  if (content.includes('report')) {
    return 'Report';
  }
  if (content.includes('article')) {
    if (content.includes('scholarly') || content.includes('academic')) {
      return 'ScholarlyArticle';
    }
    return 'Article';
  }
  if (content.includes('book')) {
    return 'Book';
  }
  if (content.includes('dataset') || content.includes('data set')) {
    return 'Dataset';
  }

  // Person detection
  if (props.birthDate || props.deathDate || content.includes('born') || content.includes('died')) {
    return 'Person';
  }

  // Organization detection
  if (content.includes('corporation') || content.includes('company') || content.includes('inc')) {
    return 'Corporation';
  }
  if (content.includes('government') || content.includes('federal') || content.includes('state')) {
    return 'GovernmentOrganization';
  }
  if (content.includes('school') || content.includes('university') || content.includes('college')) {
    return 'EducationalOrganization';
  }
  if (content.includes('hospital') || content.includes('clinic') || content.includes('medical center')) {
    return 'Hospital';
  }
  if (content.includes('ngo') || content.includes('nonprofit') || content.includes('charity')) {
    return 'NGO';
  }

  // Place detection
  if (content.includes('courthouse')) {
    return 'Courthouse';
  }
  if (content.includes('police station')) {
    return 'PoliceStation';
  }
  if (content.includes('building') || content.includes('plaza') || content.includes('street')) {
    return 'Place';
  }

  // Event detection
  if (content.includes('event') || props.startDate || props.endDate) {
    return 'Event';
  }

  // Default fallback
  return 'CreativeWork';
}