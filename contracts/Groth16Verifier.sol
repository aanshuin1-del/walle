// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

import {IVerifier} from "./interfaces/IVerifier.sol";

/// @notice snarkjs Groth16 verifier for the withdraw circuit. Deploy as `IVerifier`: `new TwisterShieldedPool(poseidon, new Groth16Verifier())`.
contract Groth16Verifier is IVerifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 7382495665065040346801383885761095303236822813758872645108700877228076093221;
    uint256 constant alphay  = 8212230091170827789928347455825965852328593692625081263903746207811529201366;
    uint256 constant betax1  = 16565162645063134972953552244459350849014614958561799536743781183714224168769;
    uint256 constant betax2  = 19499107218090895665488665268144269487691406635579161475654772898331661061302;
    uint256 constant betay1  = 5898866781787932433078440027468673719900105843760511813728033154325923399246;
    uint256 constant betay2  = 7062375055234323867091125079472134518497653812181722649084648552446327339517;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 6003276635735762683892891373776031496526053945099803954106627508397468294256;
    uint256 constant deltax2 = 20526458474561524704940844854432654727992163570421661104263263004192341489051;
    uint256 constant deltay1 = 21401251668849635587851471419047307061137265487946370433874439556693248275413;
    uint256 constant deltay2 = 7922689585361667572201445152111151183104648834846364327060295896964823334055;

    
    uint256 constant IC0x = 1426236397201298223507713622685922653867828807232267127837040806853946997280;
    uint256 constant IC0y = 20909492534028198376254904903809098742844395243675241708276116785304872169385;
    
    uint256 constant IC1x = 20900395048797900155592883848638571138285340744764726933579786159611353242670;
    uint256 constant IC1y = 8162820636462580990387608703978602111988271143447910039693934975260267807804;
    
    uint256 constant IC2x = 4546417660250342306421000659756108715102463648000736175363178491723553954271;
    uint256 constant IC2y = 13098086656502703888111981500729870262542963589470794504605492229592392977192;
    
    uint256 constant IC3x = 5642251170873325228702925289308661614022882414321048167617178193612082589290;
    uint256 constant IC3y = 16855045418881076828984434320856611504463007348989371604259499448770104724229;
    
    uint256 constant IC4x = 19918934472583774110887488988933899627162391893811720532191736229073998487913;
    uint256 constant IC4y = 18933072114079180886444912389558481680635283222446531768567349102746048582388;
    
    uint256 constant IC5x = 15168078171893771446209617248236776452436586101429640400205455727110303192329;
    uint256 constant IC5y = 20362138311110741062434243580409188945510796676054431930250343309871158538259;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint256[2] calldata _pA, uint256[2][2] calldata _pB, uint256[2] calldata _pC, uint256[5] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }

    /// @inheritdoc IVerifier
    /// @dev `proof` is the snarkjs JSON point order `[a0, a1, b00, b01, b10, b11, c0, c1]`.
    ///      `export soliditycalldata` swaps the Fp2 limbs of `pi_b` before this verifier's pairing.
    function verifyProof(uint256[8] calldata proof, uint256[5] calldata publicInputs) external view returns (bool) {
        uint256[2] memory pA = [proof[0], proof[1]];
        uint256[2][2] memory pB = [[proof[3], proof[2]], [proof[5], proof[4]]];
        uint256[2] memory pC = [proof[6], proof[7]];
        return this.verifyProof(pA, pB, pC, publicInputs);
    }
}
