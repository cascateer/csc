import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AppService, IconsGroup } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("icons/:group")
  getIcons(@Param("group") group: IconsGroup) {
    return this.appService.getIcons(group);
  }

  @Post("icons/:group")
  postIcon(@Param("group") group: IconsGroup, @Body() icons: string[]) {
    return this.appService.postIcons(group, icons);
  }
}
