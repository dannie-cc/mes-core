import { CURRENCY } from '@/common/enums';
import { registerAs } from '@nestjs/config';

export type VendorLayerRate = { pricePerSqm: number; leadTimeDays: { min: number; max: number } };
export type VendorBucket = { label: string; minArea: number; maxArea: number | null; rates: Record<string, VendorLayerRate> };
export type ExchangeRateProvider = 'frankfurter' | 'exchangerate-api' | 'open-er-api';

export interface IPriceConfig {
    boardMm2PricePerQuantity: Array<{
        minQuantity: number;
        price: number;
    }>;
    quantityDiscounts: Array<{
        minQuantity: number;
        factor: number;
    }>;
    specificationCatalog: Array<{
        label: string;
        info?: string;
        name: string;
        options: {
            label: string;
            value: string;
            unitPrice: number;
        }[];
    }>;
    shipping: {
        zoneMappings: Record<string, string[]>;
        zoneRates: Record<
            string,
            {
                base: number;
                perKg: number;
            }
        >;
        weightCalculation: {
            density: number; // kg/m³
            layerFactorBase: number;
            layerFactorMultiplier: number;
            packagingOverhead: number;
            minPhysicalWeight: number; // kg
            weightRoundingIncrement: number; // kg
            baseWeightThreshold: number; // kg
        };
    };

    //V2 CONFIGS ----------------------------------------------------------------------------
    VENDOR_CURRENCY: CURRENCY;
    PCB_VENDOR_MIN_BILLABLE_M2: number;
    PCB_VENDOR_RATE_MATRIX: VendorBucket[];
    PCB_MASS_PRODUCTION_RATES: { layerCount: number; pricePerSqm: number }[];
    PCB_VOLUME_DISCOUNTS: { min_qty: number; factor: number }[];
    PCB_RATES: {
        thickness: {
            multiplier: Record<'0.6' | '0.8' | '1.0' | '1.2' | '1.6' | '2.0', number>;
        };

        heavyCopperAdderPerSqm: {
            outer: Record<'1' | '2' | '3', number>;
            inner: Record<'0.5' | '1' | '2', number>;
        };

        finish: {
            multiplier: Record<'HASL with lead' | 'HASL without lead' | 'ENIG' | 'ImmTin' | 'OSP' | 'ImmSilver', number>;
            enforcedGoldFinish: 'ENIG';
        };

        materialType: {
            tgMultiplier: {
                tg140: number;
                tg150: number;
                tg170: number;
            };
            options: {
                std_fr4_tg140: { materialMultiplier: number };
                fr4_tg150: { materialMultiplier: number };
                fr4_tg170: { materialMultiplier: number };
                it180a: { materialMultiplier: number };
                '370hr': { materialMultiplier: number };
                ro4003c: { materialMultiplier: number };
            };
        };

        color: {
            surchargePerBoard: Record<'Green' | 'Red' | 'Blue' | 'Black' | 'White', number>;
        };

        silkscreen: {
            surchargePerBoard: Record<'none' | 'one' | 'both', number>;
        };

        solderMaskSheen: {
            surchargePerBoard: Record<'matte' | 'glossy', number>;
        };

        // minHoleSize: {
        //     surchargePerBoard: Record<'0.3' | '0.25' | '0.2' | '0.15', number>;
        // };

        covering: { tented: number; open_one: number; open_both: number };
        filling: { none: number; fill_only: number; fill_cap: number };

        goldThickness: {
            microns: Record<'1U"' | '2U"', number>;
            immersionRatePerSqm: Record<'1U"' | '2U"', number>;
        };

        goldFingers: {
            perMm: number;
            typeMultiplier: Record<'ENIG' | 'HardNiAu', number>;
            goldCostPerMmPerUm: number;
            bevelSurchargePerMm: number;
            bevelAngleMultiplier: Record<'30' | '45', number>;
        };

        edgePlating: { ratePerMeter: number; setup: number };
        drilling: {
            densityChargePer15000: number;
        };
        testing: { etestPerBoard: number };

        geometry: {
            unitSizePercent: number;
            aspectRatioSurchargePerSqm: number;
            smallUnitMaxAreaSqm: number;
        };
    };
    PCB_ASSUMPTIONS: {
        traceSpace: string; // "6/6" (purely informational)
        silkscreen: {
            side: 'both';
        };
        solderMaskSheen: {
            option: 'matte';
        };
        goldFingers: {
            type: 'ENIG';
            bevelAngle: '30';
            lengthMm: number;
        };
        drilling: {
            holesPerBoard: number;
        };
    };
    EXCHANGE_RATES: {
        primaryProvider: ExchangeRateProvider;
        ttlSeconds: number;
    };
}

const PRICE_CONFIG_TOKEN = 'price';

export const priceConfig = registerAs(PRICE_CONFIG_TOKEN, (): IPriceConfig => {
    return {
        //V2 CONFIGS-------------------------------------------------------------------------
        VENDOR_CURRENCY: CURRENCY.CNY,
        PCB_VENDOR_MIN_BILLABLE_M2: 1,
        PCB_VENDOR_RATE_MATRIX: [
            {
                label: '0 - 1 m2',
                minArea: 0,
                maxArea: 1,
                rates: {
                    '2': { pricePerSqm: 550, leadTimeDays: { min: 5, max: 7 } },
                    '4': { pricePerSqm: 750, leadTimeDays: { min: 7, max: 9 } },
                    '6': { pricePerSqm: 1000, leadTimeDays: { min: 8, max: 11 } },
                    '8': { pricePerSqm: 1350, leadTimeDays: { min: 9, max: 13 } },
                },
            },
            {
                label: '1 - 3 m2',
                minArea: 1,
                maxArea: 3,
                rates: {
                    '2': { pricePerSqm: 500, leadTimeDays: { min: 7, max: 9 } },
                    '4': { pricePerSqm: 690, leadTimeDays: { min: 8, max: 10 } },
                    '6': { pricePerSqm: 950, leadTimeDays: { min: 9, max: 12 } },
                    '8': { pricePerSqm: 1300, leadTimeDays: { min: 10, max: 15 } },
                },
            },
            {
                label: '3 - 10 m2',
                minArea: 3,
                maxArea: 10,
                rates: {
                    '2': { pricePerSqm: 430, leadTimeDays: { min: 11, max: 13 } },
                    '4': { pricePerSqm: 630, leadTimeDays: { min: 10, max: 15 } },
                    '6': { pricePerSqm: 850, leadTimeDays: { min: 13, max: 18 } },
                    '8': { pricePerSqm: 1200, leadTimeDays: { min: 14, max: 22 } },
                },
            },
            {
                label: '10 - 20 m2',
                minArea: 10,
                maxArea: 20,
                rates: {
                    '2': { pricePerSqm: 410, leadTimeDays: { min: 12, max: 15 } },
                    '4': { pricePerSqm: 610, leadTimeDays: { min: 11, max: 18 } },
                    '6': { pricePerSqm: 830, leadTimeDays: { min: 14, max: 20 } },
                    '8': { pricePerSqm: 1150, leadTimeDays: { min: 16, max: 23 } },
                },
            },
            {
                label: '20 - 50 m2',
                minArea: 20,
                maxArea: 50,
                rates: {
                    '2': { pricePerSqm: 390, leadTimeDays: { min: 13, max: 16 } },
                    '4': { pricePerSqm: 590, leadTimeDays: { min: 12, max: 20 } },
                    '6': { pricePerSqm: 800, leadTimeDays: { min: 15, max: 21 } },
                    '8': { pricePerSqm: 1100, leadTimeDays: { min: 18, max: 25 } },
                },
            },
            {
                label: '50 - 100 m2',
                minArea: 50,
                maxArea: 100,
                rates: {
                    '2': { pricePerSqm: 370, leadTimeDays: { min: 14, max: 17 } },
                    '4': { pricePerSqm: 570, leadTimeDays: { min: 14, max: 22 } },
                    '6': { pricePerSqm: 770, leadTimeDays: { min: 16, max: 23 } },
                    '8': { pricePerSqm: 1050, leadTimeDays: { min: 22, max: 28 } },
                },
            },
        ],
        PCB_MASS_PRODUCTION_RATES: [
            { layerCount: 2, pricePerSqm: 300 },
            { layerCount: 4, pricePerSqm: 800 },
            { layerCount: 6, pricePerSqm: 1250 },
            { layerCount: 8, pricePerSqm: 2000 },
        ],
        PCB_RATES: {
            thickness: { multiplier: { '0.6': 1.25, '0.8': 1.15, '1.0': 1.08, '1.2': 1.05, '1.6': 1.0, '2.0': 1.15 } },
            heavyCopperAdderPerSqm: {
                outer: {
                    '1': 0,
                    '2': 100,
                    '3': 200,
                },
                inner: {
                    '0.5': 0,
                    '1': 50,
                    '2': 100,
                },
            },
            finish: { multiplier: { 'HASL with lead': 1.0, 'HASL without lead': 1.0, ImmTin: 1.2, OSP: 0.95, ImmSilver: 1.35, ENIG: 1 }, enforcedGoldFinish: 'ENIG' as const },
            materialType: {
                tgMultiplier: {
                    tg140: 1.0,
                    tg150: 1.0 + 0.05,
                    tg170: 1.0 + 0.15,
                },
                options: {
                    std_fr4_tg140: { materialMultiplier: 1.0 },
                    fr4_tg150: { materialMultiplier: 1.05 },
                    fr4_tg170: { materialMultiplier: 1.15 },
                    it180a: { materialMultiplier: 1.15 },
                    '370hr': { materialMultiplier: 1.2 },
                    ro4003c: { materialMultiplier: 3.0 },
                },
            },
            color: { surchargePerBoard: { Green: 0, Red: 20, Blue: 0, Black: 20, White: 20 } },
            silkscreen: { surchargePerBoard: { none: 0, one: 0, both: 0 } },
            solderMaskSheen: { surchargePerBoard: { matte: 0, glossy: 0 } },
            // minHoleSize: { surchargePerBoard: { '0.3': 0, '0.25': 1.5, '0.2': 3.0, '0.15': 3.0 } },
            covering: { tented: 0, open_one: 0.25, open_both: 0.4 },
            filling: { none: 0, fill_only: 300, fill_cap: 500 },
            goldThickness: {
                microns: { '1U"': 0.0254, '2U"': 0.0508 },
                immersionRatePerSqm: { '1U"': 140, '2U"': 220 },
            },
            goldFingers: {
                perMm: 0.01,
                typeMultiplier: { ENIG: 1.0, HardNiAu: 1.6 },
                goldCostPerMmPerUm: 0.00005,
                bevelSurchargePerMm: 0.002,
                bevelAngleMultiplier: { '30': 1.0, '45': 1.1 },
            },
            edgePlating: { ratePerMeter: 2, setup: 100 },
            drilling: {
                densityChargePer15000: 5,
            },
            testing: { etestPerBoard: 1.5 },
            geometry: { unitSizePercent: 0.05, aspectRatioSurchargePerSqm: 20, smallUnitMaxAreaSqm: 0.0025 },
        },
        PCB_VOLUME_DISCOUNTS: [
            { min_qty: 1, factor: 1.0 },
            { min_qty: 10, factor: 0.95 },
            { min_qty: 50, factor: 0.9 },
            { min_qty: 100, factor: 0.85 },
            { min_qty: 500, factor: 0.8 },
        ],
        PCB_ASSUMPTIONS: {
            traceSpace: '6/6', // no rate table; purely informational until trace/space enters the payload
            silkscreen: { side: 'both' },
            solderMaskSheen: { option: 'matte' },
            goldFingers: {
                type: 'ENIG',
                bevelAngle: '30',
                lengthMm: 12,
            },
            drilling: { holesPerBoard: 350 },
        },
        EXCHANGE_RATES: {
            primaryProvider: 'frankfurter',
            ttlSeconds: 60 * 60, // 1 hour
        },

        //-----------------------------------------------------------------------------------
        boardMm2PricePerQuantity: [
            { minQuantity: 1, price: 0.00005 },
            { minQuantity: 1500, price: 0.00004029 },
            { minQuantity: 2000, price: 0.00003914 },
            { minQuantity: 3000, price: 0.000038 },
            { minQuantity: 4000, price: 0.00003686 },
            { minQuantity: 7000, price: 0.00003571 },
            { minQuantity: 11000, price: 0.00003457 },
            { minQuantity: 14000, price: 0.00003343 },
            { minQuantity: 30000, price: 0.00003286 },
            { minQuantity: 40000, price: 0.00003286 },
        ],
        quantityDiscounts: [
            { minQuantity: 200, factor: 0.1 },
            { minQuantity: 1000, factor: 0.15 },
            { minQuantity: 2000, factor: 0.2 },
            { minQuantity: 10000, factor: 0.3 },
        ],
        specificationCatalog: [
            {
                name: 'thickness',
                label: 'PCB Thickness',
                info: 'The thickness of finished board. Board thickness tolerance is +/-10%.',
                options: [
                    { label: '0.4mm', value: '0.4', unitPrice: 0.215 },
                    { label: '0.6mm', value: '0.6', unitPrice: 0.215 },
                    { label: '0.8mm', value: '0.8', unitPrice: 0.0 },
                    { label: '1.0mm', value: '1.0', unitPrice: 0.0 },
                    { label: '1.2mm', value: '1.2', unitPrice: 0.0 },
                    { label: '1.6mm', value: '1.6', unitPrice: 0.0 },
                    { label: '2.0mm', value: '2.0', unitPrice: 0.2 },
                ],
            },
            {
                name: 'color',
                label: 'PCB Color',
                info: 'The PCB solder mask color. Solder mask is used to protect the copper traces of the PCB and ensures that the solder will only flow on the exposed pads. The green standard has the best performance and fastest turnaround time. For most colors, the silkscreen is printed white. Only for white solder mask, the silkscreen is printed black.',
                options: [
                    { label: 'Green', value: 'Green', unitPrice: 0 },
                    { label: 'Red', value: 'Red', unitPrice: 0 },
                    { label: 'Blue', value: 'Blue', unitPrice: 0 },
                    { label: 'Black', value: 'Black', unitPrice: 0 },
                    { label: 'White', value: 'White', unitPrice: 0 },
                ],
            },
            {
                name: 'silkscreen',
                label: 'Silkscreen Color',
                info: 'For most colors, the silkscreen is printed white. Only for white solder mask, the silkscreen is printed black. Please note, white printed silkscreen could be easily blend in with the gray surface. No silkscreen is recommended on the bare Aluminum surface.',
                options: [
                    { label: 'White', value: 'White', unitPrice: 0 }, // Standard option
                    { label: 'Black', value: 'Black', unitPrice: 0 },
                    { label: 'Yellow', value: 'Yellow', unitPrice: 0 },
                    { label: 'Red', value: 'Red', unitPrice: 0 },
                    { label: 'Blue', value: 'Blue', unitPrice: 0 },
                ],
            },
            {
                name: 'finish',
                label: 'Surface Finish',
                info: 'HASL is an affordable finishing option that utilizes tin/lead to creating a thin protective covering on a PCB. ENIG has become the most popular surface finish in the industry as it offers flat surface, lead free and RoHS compliant, longer shelf life, and tighter tolerances can be held for plated holes.',
                options: [
                    { label: 'HASL with lead', value: 'HASL with lead', unitPrice: 0 },
                    { label: 'HASL without lead', value: 'HASL without lead', unitPrice: 0.045 },
                    { label: 'ENIG', value: 'ENIG', unitPrice: 0.175 }, // Premium option
                ],
            },
            {
                name: 'outerCopperWeight',
                label: 'Outer Copper Weight',
                info: 'Copper weight on the outer layers(top and bottom). The copper weight for inner layers is 0.5 oz by default.',
                options: [
                    { label: '1 oz', value: '1', unitPrice: 0 },
                    { label: '2 oz', value: '2', unitPrice: 0.34 },
                    { label: '3 oz', value: '3', unitPrice: 0.34 },
                ],
            },
            {
                name: 'innerCopperWeight',
                label: 'Inner Copper Weight',
                info: '',
                options: [
                    { label: '0.5 oz', value: '0.5', unitPrice: 0 },
                    { label: '1 oz', value: '1', unitPrice: 0.34 },
                    { label: '2 oz', value: '2', unitPrice: 0.68 },
                ],
            },
            {
                name: 'materialType',
                label: 'Material Type',
                info: '',
                options: [
                    { label: 'TG140', value: 'TG140', unitPrice: 0.1 }, // Standard option
                    { label: 'TG150', value: 'TG150', unitPrice: 0 }, // Standard option
                    { label: 'TG170', value: 'TG170', unitPrice: 0.1 },
                ],
            },
            {
                name: 'goldThickness',
                label: 'Gold Thickness',
                info: '',
                options: [
                    { label: '1U"', value: '1U"', unitPrice: 0 },
                    { label: '2U"', value: '2U"', unitPrice: 0.1 },
                ],
            },
            {
                name: 'covering',
                label: 'Covering',
                info: 'Covering is used to protect the plated holes from soldering. Tented means the covering is applied on the top and bottom of the PCB, while untented means it is only applied on the top or bottom. Plugged means the holes are filled with a non-conductive material, while epoxy filled and capped means the holes are filled with epoxy and capped with a layer of copper paste.',
                options: [
                    { label: 'Tented', value: 'Tented', unitPrice: 0 }, // Standard option
                    { label: 'Untented', value: 'Untented', unitPrice: 0 },
                    { label: 'Plugged', value: 'Plugged', unitPrice: 0.155 },
                    { label: 'Epoxy filled and capped', value: 'Epoxy filled and capped', unitPrice: 0.7515 },
                    { label: 'Copper paste filled and capped', value: 'Copper paste filled and capped', unitPrice: 25.0 },
                ],
            },
            {
                name: 'minHoleSize',
                info: 'The minimum hole size is the smallest diameter of the holes that can be drilled in the PCB. The minimum hole size is determined by the drill bit used and the manufacturing process. The minimum hole size for standard PCBs is 0.3mm, but it can be reduced to 0.15mm for high-precision PCBs.',
                label: 'Minimum Hole Size',
                options: [
                    { label: '0.3mm', value: '0.3', unitPrice: 0 }, // Standard option
                    { label: '0.25mm', value: '0.25', unitPrice: 0.7 },
                    { label: '0.2mm', value: '0.2', unitPrice: 0.75 },
                    { label: '0.15mm', value: '0.15', unitPrice: 0.95 }, // High precision
                ],
            },
            {
                name: 'outlineTolerance',
                info: 'The outline tolerance is the maximum deviation from the specified outline of the PCB. The outline tolerance is determined by the manufacturing process and the type of PCB. The standard outline tolerance is ±0.2mm, but it can be reduced to ±0.1mm for high-precision PCBs.',
                label: 'Outline Tolerance',
                options: [
                    { label: '±0.2mm', value: '±0.2', unitPrice: 0 }, // Standard option
                    { label: '±0.1mm', value: '±0.1', unitPrice: 0.15 },
                ],
            },
            {
                name: 'confirmProductionFiles',
                info: 'Confirm production files means that you have checked and confirmed the Gerber files, drill files, and other production files before sending them to the manufacturer. This is an important step to ensure that the PCB is manufactured correctly and meets your requirements.',
                label: 'Confirm Production Files',
                options: [
                    { label: 'No', value: 'No', unitPrice: 0 },
                    { label: 'Yes', value: 'Yes', unitPrice: 0 },
                ],
            },
            {
                name: 'markOnPCB',
                info: 'Mark on PCB means that you want to add some markings on the PCB for identification or tracking purposes. This can include order numbers, barcodes, or other information.',
                label: 'Mark on PCB',
                options: [
                    { label: 'Order number', value: 'Order number', unitPrice: 0 }, // Standard service
                    { label: 'Order number (specify position)', value: 'Order number (specify position)', unitPrice: 0 },
                    { label: 'Barcode (serial number)', value: 'Barcode (serial number)', unitPrice: 0 },
                    { label: 'None', value: 'None', unitPrice: 0 },
                ],
            },
            {
                name: 'goldFingers',
                label: 'Gold Fingers',
                info: 'Gold fingers are the gold-plated columns along the connecting edges of PCBs. Only when ENIG surface finish is chosen, the fingers will be gold-plated. If you choose HASL surface finish, we will use HASL as edge connect plating.',
                options: [
                    { label: 'No', value: 'No', unitPrice: 0 },
                    { label: 'Yes', value: 'Yes', unitPrice: 0.12 },
                ],
            },
            {
                name: 'edgePlating',
                label: 'Edge Plating',
                info: 'Edge plating on PCB enhances durability, EMC performance, and grounding. It protects edges, reduces EMI, improves signal integrity, and facilitates reliable electrical connections',
                options: [
                    { label: 'No', value: 'No', unitPrice: 0 },
                    { label: 'Yes', value: 'Yes', unitPrice: 0.25 },
                ],
            },
            {
                name: 'castellatedHoles',
                label: 'Castellated Holes',
                info: 'Castellated holes are half holes on the edge of the PCB that allow for easy soldering to another PCB. They are typically used in modules or components that need to be easily connected to a PCB.',
                options: [
                    { label: 'No', value: 'No', unitPrice: 0 },
                    { label: 'Yes', value: 'Yes', unitPrice: 0.08 },
                ],
            },
            {
                name: 'kelvinTest',
                label: '4-wire Kelvin Test',
                info: 'Kelvin test is a method used to measure the resistance of a PCB by applying a current through two wires and measuring the voltage across two other wires. This method is used to ensure the accuracy of the resistance measurement and to eliminate the effects of contact resistance.',
                options: [
                    { label: 'No', value: 'No', unitPrice: 0 },
                    { label: 'Yes', value: 'Yes', unitPrice: 0.05 },
                ],
            },
            {
                name: 'paperBetweenPCBs',
                label: 'Paper Between PCBs',
                info: 'Paper between PCBs is used to prevent the PCBs from sticking together during shipping and handling. This is especially important for PCBs with a high density of components or for PCBs that are sensitive to moisture.',
                options: [
                    { label: 'No', value: 'No', unitPrice: 0 },
                    { label: 'Yes', value: 'Yes', unitPrice: 0.01 },
                ],
            },
            {
                name: 'appearanceQuality',
                label: 'Appearance Quality',
                info: 'Appearance quality refers to the visual quality of the PCB, including the finish, solder mask, and silkscreen. The IPC class 2 standard is a common standard for PCB appearance quality, while superb quality is a higher standard that ensures a flawless appearance.',
                options: [
                    { label: 'IPC class 2 standard', value: 'IPC class 2 standard', unitPrice: 0 },
                    { label: 'Superb quality', value: 'Superb quality', unitPrice: 0.04 },
                ],
            },
            {
                name: 'silkscreenTechnology',
                label: 'Silkscreen Technology',
                info: 'Silkscreen technology refers to the method used to print the silkscreen on the PCB. Ink-jet is a common method that uses ink to print the silkscreen, while high precision and easy EDA multi-color are more advanced methods that allow for more detailed and colorful silkscreen printing. High-definition exposure is a method that uses light to expose the silkscreen onto the PCB.',
                options: [
                    { label: 'Ink-jet', value: 'Ink-jet', unitPrice: 0 }, // Standard option
                    { label: 'High precision', value: 'High precision', unitPrice: 0.02 },
                    { label: 'Easy EDA multi-color', value: 'Easy EDA multi-color', unitPrice: 0.05 },
                    { label: 'High-definition exposure', value: 'High-definition exposure', unitPrice: 0.03 },
                ],
            },
        ],
        shipping: {
            zoneMappings: {
                Z0: ['tr'], // Domestic - Turkey
                Z1: ['gr', 'bg', 'cy', 'ge', 'az'], // Nearby countries
                Z2: [
                    // Europe & Middle East
                    'ad',
                    'al',
                    'am',
                    'at',
                    'ax',
                    'ba',
                    'be',
                    'by',
                    'ch',
                    'cz',
                    'de',
                    'dk',
                    'ee',
                    'es',
                    'fi',
                    'fo',
                    'fr',
                    'gb',
                    'gi',
                    'hr',
                    'hu',
                    'ie',
                    'il',
                    'im',
                    'iq',
                    'ir',
                    'is',
                    'it',
                    'je',
                    'jo',
                    'lb',
                    'li',
                    'lt',
                    'lu',
                    'lv',
                    'mc',
                    'md',
                    'me',
                    'mk',
                    'mt',
                    'nl',
                    'no',
                    'pl',
                    'ps',
                    'pt',
                    'ro',
                    'rs',
                    'ru',
                    'sa',
                    'se',
                    'si',
                    'sk',
                    'sm',
                    'sy',
                    'ua',
                    'va',
                    'xk',
                    'ye',
                    'ae',
                    'qa',
                    'kw',
                    'bh',
                    'om',
                ],
                Z3: [
                    // North America
                    'us',
                    'ca',
                    'mx',
                    'bz',
                    'cr',
                    'sv',
                    'gt',
                    'hn',
                    'ni',
                    'pa',
                    'do',
                    'ht',
                    'bb',
                    'jm',
                    'tt',
                    'bs',
                    'ag',
                    'gd',
                    'lc',
                    'vc',
                    'kn',
                    'cu',
                    'pr',
                    'vi',
                ],
                Z4: [
                    // Asia Pacific core
                    'cn',
                    'jp',
                    'kr',
                    'sg',
                    'in',
                    'my',
                    'th',
                    'vn',
                    'id',
                    'ph',
                    'tw',
                    'hk',
                    'bn',
                    'kh',
                    'la',
                    'mm',
                    'np',
                    'pk',
                    'lk',
                    'bd',
                    'bt',
                    'mn',
                    'tl',
                    'kz',
                    'uz',
                    'tj',
                    'tm',
                    'kg',
                ],
                Z5: [
                    // Oceania
                    'au',
                    'nz',
                    'fj',
                    'pg',
                    'sb',
                    'to',
                    'tv',
                    'vu',
                    'ws',
                    'pf',
                    'nc',
                    'ck',
                    'nu',
                    'pw',
                    'mh',
                    'fm',
                    'ki',
                ],
                Z6: [
                    // South America & Africa
                    'br',
                    'ar',
                    'cl',
                    'pe',
                    'co',
                    'uy',
                    'py',
                    'bo',
                    'ec',
                    've',
                    'za',
                    'ng',
                    'eg',
                    'ma',
                    'ke',
                    'gh',
                    'dz',
                    'tn',
                    'ao',
                    'zm',
                    'zw',
                    'mw',
                    'mz',
                    'bw',
                    'na',
                    'ls',
                    'sz',
                    'gm',
                    'sl',
                    'lr',
                    'ci',
                    'bf',
                    'ne',
                    'tg',
                    'bj',
                    'ml',
                    'sn',
                    'mr',
                    'gn',
                    'ga',
                    'cg',
                    'cd',
                    'cm',
                    'td',
                    'cf',
                    'ug',
                    'rw',
                    'bi',
                    'et',
                    'so',
                    'dj',
                    'er',
                    'sd',
                    'ss',
                    'gq',
                    'st',
                    'cv',
                    'sc',
                    'km',
                    'mg',
                ],
                Z7: [
                    // Remote, special territories, or undefined
                    'aq',
                    'bv',
                    'tf',
                    'pn',
                    'wf',
                    'yt',
                    're',
                    'gp',
                    'mq',
                    'gf',
                    'pm',
                    'io',
                    'sh',
                    'fk',
                    'gs',
                    'hm',
                    'sx',
                    'cw',
                    'bq',
                    'aw',
                ],
            },
            zoneRates: {
                Z0: { base: 3, perKg: 0.8 }, // Domestic Turkey
                Z1: { base: 5, perKg: 1.2 }, // Nearby countries (Greece, Bulgaria, etc.)
                Z2: { base: 7, perKg: 1.8 }, // Europe & Middle East
                Z3: { base: 12, perKg: 3.0 }, // North America
                Z4: { base: 10, perKg: 2.5 }, // Asia Pacific
                Z5: { base: 15, perKg: 3.5 }, // Oceania (AU, NZ)
                Z6: { base: 13, perKg: 3.2 }, // South America & Africa
                Z7: { base: 18, perKg: 4.0 }, // Rest of world
            },
            weightCalculation: {
                density: 1850, // kg/m³ (approx FR4)
                layerFactorBase: 0.9,
                layerFactorMultiplier: 0.04,
                packagingOverhead: 1.25, // +25%
                minPhysicalWeight: 0.15, // kg (reduced for small PCB orders)
                weightRoundingIncrement: 0.1, // kg
                baseWeightThreshold: 0.5, // kg
            },
        },
    };
});
