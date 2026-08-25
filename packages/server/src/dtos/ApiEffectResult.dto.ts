import { Type } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

interface ApiEffectResultArg<T> {
  data?: T;
  providesTags?: string[];
  invalidatesTags?: string[];
}

export class ApiEffectResult<T> {
  data?: T;
  providesTags?: string[];
  invalidatesTags?: string[];

  constructor({ data, providesTags, invalidatesTags }: ApiEffectResultArg<T>) {
    this.data = data;
    this.providesTags = providesTags;
    this.invalidatesTags = invalidatesTags;
  }
}

export function ApiEffectResultDTO<T>(type: Type<T>) {
  return function mixin(ctor: {
    // eslint-disable-next-line @typescript-eslint/prefer-function-type
    new (arg: ApiEffectResultArg<T>): ApiEffectResult<T>;
  }) {
    class ApiEffectResult {
      @ApiProperty({
        type,
      })
      data: ApiEffectResultArg<T>["data"];

      @ApiProperty({
        type: Array<string>,
        required: false,
      })
      providesTags: ApiEffectResultArg<T>["providesTags"];

      @ApiProperty({
        type: Array<string>,
        required: false,
      })
      invalidatesTags: ApiEffectResultArg<T>["invalidatesTags"];

      constructor({
        data,
        providesTags,
        invalidatesTags,
      }: ApiEffectResultArg<T>) {
        this.data = data;
        this.providesTags = providesTags;
        this.invalidatesTags = invalidatesTags;
      }
    }

    return ApiEffectResult;
  };
}
