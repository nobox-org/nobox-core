export const getPublicPolicy = (bucketName: string) => {
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicRead",
                "Action": [
                    "s3:GetObject"
                ],
                "Effect": "Allow",
                "Resource": `arn:aws:s3:::${bucketName}/*`,
                "Principal": "*"
            }
        ]
    }
}