export class CustomError extends Error {
  type: string
  statusCode: number

  constructor(type: string, message: string, statusCode = 400) {
    super(message)
    this.type = type
    this.statusCode = statusCode

    Object.setPrototypeOf(this, CustomError.prototype)
  }
}
