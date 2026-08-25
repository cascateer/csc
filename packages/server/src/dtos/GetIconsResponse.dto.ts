import { ApiEffectResult, ApiEffectResultDTO } from "./ApiEffectResult.dto";

@ApiEffectResultDTO(Array<string>)
export class GetIconsResponseDTO extends ApiEffectResult<string[]> {}
