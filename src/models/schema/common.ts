import {
    FILE_TYPE,
} from '@/common/enums';
import { pgEnum } from 'drizzle-orm/pg-core';

//Important! When defining pgEnum, it should be exported. Otherwise, migrations will not work.

//Attachment
export const attachmentType = pgEnum('attachment_type', [...(Object.values(FILE_TYPE) as [FILE_TYPE, ...FILE_TYPE[]])]);
