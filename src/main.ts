import { FsArchAppBuilder } from "@fsarch/server";
import { AppModule } from "./app.module.js";
import { DATABASE_OPTIONS } from "./database/index.js";

async function bootstrap() {
  const app = await new FsArchAppBuilder(AppModule, {
    name: 'AI-Server',
    version: '1.0.0',
  })
    .addSwagger({
      title: 'AI-Server',
      description: 'The AI-Server API description',
      version: '1.0',
    })
    .enableAuth()
    .setDatabase(DATABASE_OPTIONS)
    .build();

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
