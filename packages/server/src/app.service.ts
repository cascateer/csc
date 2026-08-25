import { Injectable } from "@nestjs/common";
import { GetIconsResponseDTO } from "./dtos/GetIconsResponse.dto";
import { PostIconsResponseDTO } from "./dtos/PostIconsResponse.dto";

export enum IconsGroup {
  Insects = "insects",
}

@Injectable()
export class AppService {
  private icons = {
    [IconsGroup.Insects]: ["🦟", "🪳"],
  };

  private iconsGroupTag = (group: IconsGroup) => `icons/${group}`;

  getIcons(group: IconsGroup) {
    return new GetIconsResponseDTO({
      data: this.icons[group],
      providesTags: [this.iconsGroupTag(group)],
    });
  }

  postIcons(group: IconsGroup, newIcons: string[]) {
    return new PostIconsResponseDTO({
      data: (this.icons[group] = this.icons[group].concat(newIcons)),
      invalidatesTags: [this.iconsGroupTag(group)],
    });
  }
}
