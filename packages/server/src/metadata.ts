/* eslint-disable */
export default async () => {
    const t = {
        ["./dtos/GetIconsResponse.dto"]: await import("./dtos/GetIconsResponse.dto"),
        ["./dtos/PostIconsResponse.dto"]: await import("./dtos/PostIconsResponse.dto")
    };
    return { "@nestjs/swagger": { "models": [[import("./dtos/ApiEffectResult.dto"), { "ApiEffectResult": { data: { required: false }, providesTags: { required: false, type: () => [String] }, invalidatesTags: { required: false, type: () => [String] } } }], [import("./dtos/GetIconsResponse.dto"), { "GetIconsResponseDTO": {} }], [import("./dtos/PostIconsResponse.dto"), { "PostIconsResponseDTO": {} }]], "controllers": [[import("./app.controller"), { "AppController": { "getIcons": { type: t["./dtos/GetIconsResponse.dto"].GetIconsResponseDTO }, "postIcon": { type: t["./dtos/PostIconsResponse.dto"].PostIconsResponseDTO } } }]] } };
};