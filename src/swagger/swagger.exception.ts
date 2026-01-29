import { HttpException, Type } from '@nestjs/common';
import { ApiResponse, ApiResponseOptions, getSchemaPath } from '@nestjs/swagger';
import { getTypeIsArrayTuple } from '@nestjs/swagger/dist/decorators/helpers';
import { ReferenceObject, ResponseObject, SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export type Func = () => void;

export interface ApiExceptionOptions extends Omit<ResponseObject, 'description'> {
  description?: string;
  type?: Func | [Func];
  isArray?: boolean;
  schema?: SchemaObject;
}

export const ApiException = <T extends HttpException>(exception: () => Type<T>, options: ApiExceptionOptions = {}): MethodDecorator & ClassDecorator => {
  const instance = new (exception())();

  const apiResponseOptions: ApiResponseOptions = {
    status: instance.getStatus(),
    description: options?.description || instance.message,
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: instance.getStatus(),
        },
        message: {
          type: 'string',
        },
        error: {
          type: 'string',
          example: instance.message,
        },
      },
      required: ['statusCode', 'message'],
    },
  };

  if (options.schema) {
    apiResponseOptions.schema.properties!.message = options.schema;
  } else if (options.type) {
    const [type, isArray] = getTypeIsArrayTuple(options.type, !!options.isArray);
    // For standard data types (Object, String, etc), an error will be shown on the swagger api page, I don't know how to get around it
    (apiResponseOptions.schema.properties!.message as ReferenceObject)['$ref'] = getSchemaPath(type!());

    if (isArray) {
      apiResponseOptions.schema.properties!.message = {
        type: 'array',
        items: {
          type: 'object',
          $ref: (apiResponseOptions.schema.properties?.message as ReferenceObject)['$ref'],
        },
      };
    }
  }

  return ApiResponse(apiResponseOptions);
};
