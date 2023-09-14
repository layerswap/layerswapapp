import { SwapFailReasons } from "../../../../../Models/RangeError"

const resolveFailError = (error: SwapFailReasons): string => {
    switch (error) {
      case SwapFailReasons.RECEIVED_LESS_THAN_VALID_RANGE:
        return "Received less than the valid range.";
      case SwapFailReasons.RECEIVED_MORE_THAN_VALID_RANGE:
        return "Received more than the valid range.";
      default:
        return "Unknown error";
    }
  }

export default resolveFailError;
