When adding a database migration file, also register it in the app.module.ts file under the database.migrations array inside FsarchModule.register().

Database models are defined in the src/database/entities directory and registered in the database.entities array inside FsarchModule.register().

Database models are not directly passed to the client. Instead they are converted to DTOs, which has to be generated inside the src/models directory.

Controllers are defined in the src/controllers directory and follow the directory structure of the rest-endpoints.

Controller modules and the controlller classes itself are named using plurals.

Controllers do not query the database directly. Instead they use the services defined in the src/repositories directory.

Service modules and the service classes itself are named using singular.
