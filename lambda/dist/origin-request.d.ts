import { CloudFrontRequestEvent, CloudFrontResultResponse } from 'aws-lambda';
export declare function handler(event: CloudFrontRequestEvent): Promise<CloudFrontResultResponse | CloudFrontRequestEvent['Records'][0]['cf']['request']>;
