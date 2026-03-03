import { expect } from "chai";
import { AuctionModelGasEstimatorV2 } from "../../src/tx-delivery-man/AuctionModelGasEstimatorV2";
import { createEip1559TestOpts } from "../helpers";

describe("AuctionModelGasEstimatorV2", () => {
  describe("scaleFees with auctionModelGasMultipliers", () => {
    it("should use explicit multipliers from opts and clamp to last value", () => {
      const opts = createEip1559TestOpts({
        auctionModelGasMultipliers: [2, 5, 10],
      });
      const estimator = new AuctionModelGasEstimatorV2(opts);
      const baseFees = { gasPrice: 1000 };

      expect(estimator.scaleFees(baseFees, 0)).to.deep.equal({ gasPrice: 2000 }); // ×2
      expect(estimator.scaleFees(baseFees, 1)).to.deep.equal({ gasPrice: 5000 }); // ×5
      expect(estimator.scaleFees(baseFees, 2)).to.deep.equal({ gasPrice: 10000 }); // ×10
      // beyond array length — clamp to last value
      expect(estimator.scaleFees(baseFees, 5)).to.deep.equal({ gasPrice: 10000 }); // ×10
    });
  });
});
