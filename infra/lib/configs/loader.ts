import * as path from 'path';
import * as joi from 'joi';
import * as dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
});

console.log('process.env', process.env);

interface IConfig {
  Ns: string;
  Codecommit: {
    RepositoryName: string;
    PathFilters: string[];
  };
}

const schema = joi
  .object({
    NS: joi.string().required(),
    CODE_REPOSITORY_NAME: joi.string().required(),
    CODE_PATH_FILTERS: joi.string().required(),
  })
  .unknown();

const { value: envVars, error } = schema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const Config: IConfig = {
  Ns: envVars.NS,
  Codecommit: {
    RepositoryName: envVars.CODE_REPOSITORY_NAME,
    PathFilters: envVars.CODE_PATH_FILTERS.split(',')
      .map((v: string) => v.trim())
      .filter(Boolean),
  },
};
