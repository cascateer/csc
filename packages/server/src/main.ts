import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { exec } from "child_process";
import { promisify } from "util";
import { AppModule } from "./app.module";
import metadata from "./metadata";

const execAsync = promisify(exec);

async function bootstrap() {
  const BASE_URL = "http://localhost:2800";

  const app = await NestFactory.create(AppModule, { cors: { origin: true } });
  const config = new DocumentBuilder()
    .setTitle("Mock API")
    .setVersion("1.0")
    .addServer(BASE_URL)
    .build();

  await SwaggerModule.loadPluginMetadata(metadata);

  SwaggerModule.setup("api", app, () =>
    SwaggerModule.createDocument(app, config),
  );

  await app.listen(2800);

  const { stderr, stdout } = await execAsync(
    `openapi-generator-cli generate -g typescript-rxjs --skip-validate-spec -i ${BASE_URL}/api-json -o ./openapi`,
  );

  if (stderr) {
    console.error(stderr);
  } else {
    console.log(stdout);
  }
}

void bootstrap();
