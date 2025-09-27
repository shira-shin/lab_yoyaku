export type IssuePath = Array<string | number>

export type FlattenedError = {
  formErrors: string[]
  fieldErrors: Record<string, string[]>
}

export class ZodError extends Error {
  readonly issues: { path: IssuePath; message: string }[]

  constructor(issues: { path: IssuePath; message: string }[]) {
    super(issues.map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('\n'))
    this.issues = issues
    this.name = 'ZodError'
  }

  flatten(): FlattenedError {
    const formErrors: string[] = []
    const fieldErrors: Record<string, string[]> = {}

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message)
        continue
      }
      const key = issue.path.map(part => `${part}`).join('.')
      if (!fieldErrors[key]) {
        fieldErrors[key] = []
      }
      fieldErrors[key].push(issue.message)
    }

    return { formErrors, fieldErrors }
  }
}

export interface SafeParseSuccess<T> { success: true; data: T }
export interface SafeParseFailure { success: false; error: ZodError }
export type SafeParseReturnType<T> = SafeParseSuccess<T> | SafeParseFailure

abstract class BaseSchema<T> {
  abstract internalParse(input: unknown, path: IssuePath): T

  parse(input: unknown): T {
    return this.internalParse(input, [])
  }

  safeParse(input: unknown): SafeParseReturnType<T> {
    try {
      return { success: true as const, data: this.internalParse(input, []) }
    } catch (error) {
      if (error instanceof ZodError) {
        return { success: false as const, error }
      }
      throw error
    }
  }

  optional(): BaseSchema<T | undefined> {
    return new OptionalSchema(this)
  }

  nullable(): BaseSchema<T | null> {
    return new NullableSchema(this)
  }

  default(value: T): BaseSchema<T> {
    return new DefaultSchema(this, value)
  }
}

class OptionalSchema<T> extends BaseSchema<T | undefined> {
  constructor(private readonly inner: BaseSchema<T>) {
    super()
  }

  internalParse(input: unknown, path: IssuePath): T | undefined {
    if (input === undefined) {
      return undefined
    }
    return this.inner.internalParse(input, path)
  }
}

class NullableSchema<T> extends BaseSchema<T | null> {
  constructor(private readonly inner: BaseSchema<T>) {
    super()
  }

  internalParse(input: unknown, path: IssuePath): T | null {
    if (input === null) {
      return null
    }
    return this.inner.internalParse(input, path)
  }
}

class DefaultSchema<T> extends BaseSchema<T> {
  constructor(private readonly inner: BaseSchema<T>, private readonly defaultValue: T) {
    super()
  }

  internalParse(input: unknown, path: IssuePath): T {
    if (input === undefined) {
      return this.defaultValue
    }
    return this.inner.internalParse(input, path)
  }
}

class StringSchema extends BaseSchema<string> {
  private readonly validators: Array<(value: string) => string | null> = []

  min(length: number, message?: string): this {
    this.validators.push(value => {
      if (value.length < length) {
        return message ?? `must contain at least ${length} character(s)`
      }
      return null
    })
    return this
  }

  internalParse(input: unknown, path: IssuePath): string {
    if (typeof input !== 'string') {
      throw new ZodError([{ path, message: 'expected string' }])
    }

    for (const validator of this.validators) {
      const failure = validator(input)
      if (failure) {
        throw new ZodError([{ path, message: failure }])
      }
    }

    return input
  }
}

class DateSchema extends BaseSchema<Date> {
  internalParse(input: unknown, path: IssuePath): Date {
    let value: Date
    if (input instanceof Date) {
      value = input
    } else if (typeof input === 'string' || typeof input === 'number') {
      value = new Date(input)
    } else {
      throw new ZodError([{ path, message: 'expected date' }])
    }

    if (Number.isNaN(value.getTime())) {
      throw new ZodError([{ path, message: 'invalid date' }])
    }

    return value
  }
}

class BooleanSchema extends BaseSchema<boolean> {
  internalParse(input: unknown, path: IssuePath): boolean {
    if (typeof input !== 'boolean') {
      throw new ZodError([{ path, message: 'expected boolean' }])
    }
    return input
  }
}

class NumberSchema extends BaseSchema<number> {
  private readonly validators: Array<(value: number) => string | null> = []

  constructor(private readonly options: { coerce: boolean } = { coerce: false }) {
    super()
  }

  int(message?: string): this {
    this.validators.push(value => {
      if (!Number.isInteger(value)) {
        return message ?? 'expected integer'
      }
      return null
    })
    return this
  }

  min(minValue: number, message?: string): this {
    this.validators.push(value => {
      if (value < minValue) {
        return message ?? `must be greater than or equal to ${minValue}`
      }
      return null
    })
    return this
  }

  max(maxValue: number, message?: string): this {
    this.validators.push(value => {
      if (value > maxValue) {
        return message ?? `must be less than or equal to ${maxValue}`
      }
      return null
    })
    return this
  }

  internalParse(input: unknown, path: IssuePath): number {
    let value = input
    if (this.options.coerce) {
      value = Number(value)
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ZodError([{ path, message: 'expected number' }])
    }

    for (const validator of this.validators) {
      const failure = validator(value)
      if (failure) {
        throw new ZodError([{ path, message: failure }])
      }
    }

    return value
  }
}

type Shape = Record<string, BaseSchema<any>>

type InferShape<S extends Shape> = { [K in keyof S]: InferSchema<S[K]> }

type InferSchema<S> = S extends BaseSchema<infer T> ? T : never

class ArraySchema<I extends BaseSchema<any>> extends BaseSchema<Array<InferSchema<I>>> {
  constructor(private readonly inner: I) {
    super()
  }

  internalParse(input: unknown, path: IssuePath): Array<InferSchema<I>> {
    if (!Array.isArray(input)) {
      throw new ZodError([{ path, message: 'expected array' }])
    }

    return input.map((value, index) => {
      try {
        return this.inner.internalParse(value, [...path, index])
      } catch (error) {
        if (error instanceof ZodError) {
          throw error
        }
        throw error
      }
    })
  }
}

class EnumSchema<Values extends readonly [string, ...string[]]> extends BaseSchema<Values[number]> {
  constructor(private readonly options: Values) {
    super()
  }

  internalParse(input: unknown, path: IssuePath): Values[number] {
    if (typeof input !== 'string') {
      throw new ZodError([{ path, message: 'expected string' }])
    }

    if (!this.options.includes(input as Values[number])) {
      throw new ZodError([{ path, message: `expected one of: ${this.options.join(', ')}` }])
    }

    return input as Values[number]
  }
}

class ObjectSchema<S extends Shape> extends BaseSchema<InferShape<S>> {
  constructor(private readonly shape: S) {
    super()
  }

  internalParse(input: unknown, path: IssuePath): InferShape<S> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ZodError([{ path, message: 'expected object' }])
    }

    const record = input as Record<string, unknown>
    const result: Record<string, unknown> = {}

    for (const key of Object.keys(this.shape) as Array<keyof S>) {
      const schema = this.shape[key]
      try {
        result[key as string] = schema.internalParse(record[key as string], [...path, key as string])
      } catch (error) {
        if (error instanceof ZodError) {
          throw error
        }
        throw error
      }
    }

    return result as InferShape<S>
  }
}

const coerce = {
  date: () => new DateSchema(),
  number: () => new NumberSchema({ coerce: true }),
}

interface ZHelpers {
  object: <S extends Shape>(shape: S) => ObjectSchema<S>
  string: () => StringSchema
  number: () => NumberSchema
  boolean: () => BooleanSchema
  array: <I extends BaseSchema<any>>(schema: I) => ArraySchema<I>
  enum: <const Values extends readonly [string, ...string[]]>(values: Values) => EnumSchema<Values>
  coerce: typeof coerce
  ZodError: typeof ZodError
}

export const z: ZHelpers = {
  object: <S extends Shape>(shape: S) => new ObjectSchema(shape),
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  array: <I extends BaseSchema<any>>(schema: I) => new ArraySchema(schema),
  enum: <const Values extends readonly [string, ...string[]]>(values: Values) => new EnumSchema(values),
  coerce,
  ZodError,
}

export type infer<T extends BaseSchema<any>> = T extends BaseSchema<infer U> ? U : never
