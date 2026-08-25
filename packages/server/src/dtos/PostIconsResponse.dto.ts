import { ApiEffectResult, ApiEffectResultDTO } from "./ApiEffectResult.dto";

@ApiEffectResultDTO(Array<string>)
export class PostIconsResponseDTO extends ApiEffectResult<string[]> {}
