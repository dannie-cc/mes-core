export enum LOCALE {
    CN = 'cn',
    EN = 'en',
    RU = 'ru',
    TR = 'tr',
}

export enum CURRENCY {
    USD = 'USD',
    CNY = 'CNY',
    EUR = 'EUR',
    TRY = 'TRY',
}

export enum ORDER_STATUS {
    DRAFT = 'draft',
    RELEASED = 'released',
    CLOSED = 'closed',
    CANCELED = 'canceled',
}

export enum PRODUCT_TYPE {
    PCB = 'pcb',
    PCBA = 'pcba',
    ASSEMBLY = 'assembly',
}

export enum NOTIFICATION_TYPE {
    WORK_ORDER_STATUS = 'work_order_status',
    SHIPPING_UPDATE = 'shipping_update',
    SYSTEM = 'system',
    PRODUCT = 'product',
}

export enum NOTIFICATION_STATUS {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

export enum NOTIFICATION_WAY {
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
    IN_APP = 'in_app',
}


export enum ADJUSTMENT_TYPE {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
    QUANTITY = 'quantity',
    BULK = 'bulk',
}


export enum ASSEMBLY_TYPE {
    SINGLE_SIDED = 'single_sided',
    DOUBLE_SIDED = 'double_sided',
    MIXED = 'mixed',
}

export enum DIMENSION_UNIT {
    MILLIMETER = 'mm',
    INCH = 'inch',
}

export enum ORDER_STAGE {
    REVIEW = 'review',
    ENGINEERING = 'engineering',
    MANUFACTURING = 'manufacturing',
    QUALITY_CONTROL = 'quality_control',
    PACKAGING = 'packaging',
    SHIPPING = 'shipping',
    DELIVERY = 'delivery',
}

export enum STAGE_STATUS {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    SKIPPED = 'skipped',
    ON_HOLD = 'on_hold',
    COMPLETED = 'completed',
}

export enum TICKET_TYPE {
    QUESTION = 'question',
    FEEDBACK = 'feedback',
    COMPLAINT = 'complaint',
    GENERAL = 'general',
}

export enum TICKET_STATUS {
    OPEN = 'open',
    CLOSED = 'closed',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
    ARCHIVED = 'archived',
}
export enum SENDER_TYPE {
    USER = 'user',
    ADMIN = 'admin',
    SYSTEM = 'system',
}
export enum MESSAGE_TYPE {
    MESSAGE = 'message',
    STATUS_CHANGE = 'status_change',
    NOTE = 'note',
}

export enum WORKFLOW_TYPE {
    PCB = 'pcb',
    PCBA = 'pcba',
}

export enum WORKFLOW_PRIORITY {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum WORKFLOW_COMPLEXITY {
    SIMPLE = 'simple',
    MEDIUM = 'medium',
    COMPLEX = 'complex',
}

export enum ORDER_EVENT_TYPE {
    ACTION = 'action',
    INFO = 'info',
}

export enum ORDER_EVENT_ACTION_TYPE {
    GERBER_REVISION = 'gerber_revision',
    CONSENT = 'consent',
    FEEDBACK = 'feedback',
    SHIPMENT_ADDRESS = 'shipment_address',
}

export enum ORDER_EVENT_INFO_TYPE {
    IN_PROGRESS = 'in_progress',
    EVIDENCE = 'evidence',
    CANCELLED = 'cancelled',
}
export enum FILE_TYPE {
    GERBER = 'gerber',
    BOM = 'bom',
    CENTROID = 'centroid',
    SCHEMATIC = 'schematic',
    ASSEMBLY_DRAWING = 'assembly_drawing',
    PICK_AND_PLACE = 'pick_and_place',
    SPECIFICATION = 'specification',
    OTHER = 'other',
}
