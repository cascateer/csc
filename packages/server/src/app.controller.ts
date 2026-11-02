import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
} from "@nestjs/common";
import fontkit from "@pdf-lib/fontkit";
import { randomInt } from "crypto";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { PDFDocument } from "pdf-lib";
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

  @Get("pdf/:aid/:layout")
  async getPdf(
    @Param("aid") aid: string,
    @Param("layout") layout: string,
  ): Promise<StreamableFile> {
    const pagesCount = randomInt(5, 20);
    const pdfDoc = await PDFDocument.create();

    pdfDoc.registerFontkit(fontkit);

    for (let i = 0; i < pagesCount; i++) {
      const page = pdfDoc.addPage([550, 750]);
      const drawTextOptions = {
        x: 50,
        size: 30,
        font: await pdfDoc.embedFont(
          await fetch(
            "https://en.fontsloader.com/type_files/616f23a0651078508266b368/files/RotisSansSerifStd-Light.ttf",
          ).then((res) => res.arrayBuffer()),
        ),
      };

      if (layout === "1" && i === 0) {
        page.drawImage(
          await pdfDoc.embedPng(
            await readFile(
              resolve(__dirname, "..", "..", "public", "bohrprofil.png"),
            ),
          ),
          { x: 45, y: 15, height: 500, width: 405 },
        );
      }

      page.drawText("Aufschluss", { y: 650, ...drawTextOptions });
      page.drawText("Layout", { y: 600, ...drawTextOptions });
      page.drawText("Seite", {
        y: 550,
        ...drawTextOptions,
      });

      page.drawText(aid, { y: 650, ...drawTextOptions, x: 300 });
      page.drawText(layout, { y: 600, ...drawTextOptions, x: 300 });
      page.drawText(`${i + 1}/${pagesCount}`, {
        y: 550,
        ...drawTextOptions,
        x: 300,
      });
    }

    return new StreamableFile(Buffer.from(await pdfDoc.save()));
  }
}
