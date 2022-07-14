import { SpaceType } from "../../types";

export default function (userId, userEmail, search) {
  return {
    query: {
      ...(!userId ? { type: SpaceType.public } : {
        $or: [
          {
            type: SpaceType.private,
            invitees: userEmail,
          },
          {
            type: SpaceType.private,
            members: userId
          },
          {
            type: SpaceType.private,
            createdBy: userId
          }, {
            type: SpaceType.public
          }]
      }),
      ...(!search ? {} : { $text: { $search: search }, })
    },
    projection: search ? { score: { $meta: "textScore" } } : {},
    sort: !search ? { createdAt: -1 } : {
      score: { $meta: "textScore" }, createdAt: -1
    }
  };
}