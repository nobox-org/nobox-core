import { ClaimStatus } from "src/types"

export const mapClaimStatus = (claimStatus: ClaimStatus) => {
    return {
        [ClaimStatus.claimed]: true,
        [ClaimStatus.unclaimed]: false,
        [ClaimStatus.all]: null
    }[claimStatus]
}