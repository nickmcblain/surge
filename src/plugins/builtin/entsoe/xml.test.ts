import { describe, expect, test } from "bun:test";
import { EntsoeApiError, mergeSeries, parseEntsoeDocument } from "./xml";
import { localDayWindow, localMidnightUtc } from "./time";
import { priceStats } from "./stats";

const PRICES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:3">
  <mRID>doc</mRID>
  <TimeSeries>
    <mRID>1</mRID>
    <businessType>A62</businessType>
    <in_Domain.mRID codingScheme="A01">10Y1001A1001A82H</in_Domain.mRID>
    <out_Domain.mRID codingScheme="A01">10Y1001A1001A82H</out_Domain.mRID>
    <currency_Unit.name>EUR</currency_Unit.name>
    <price_Measure_Unit.name>MWH</price_Measure_Unit.name>
    <curveType>A03</curveType>
    <Period>
      <timeInterval><start>2026-09-10T22:00Z</start><end>2026-09-11T02:00Z</end></timeInterval>
      <resolution>PT60M</resolution>
      <Point><position>1</position><price.amount>80.5</price.amount></Point>
      <Point><position>2</position><price.amount>75.0</price.amount></Point>
      <Point><position>4</position><price.amount>-2.25</price.amount></Point>
    </Period>
  </TimeSeries>
  <TimeSeries>
    <mRID>2</mRID>
    <businessType>A62</businessType>
    <in_Domain.mRID codingScheme="A01">10Y1001A1001A82H</in_Domain.mRID>
    <out_Domain.mRID codingScheme="A01">10Y1001A1001A82H</out_Domain.mRID>
    <currency_Unit.name>EUR</currency_Unit.name>
    <price_Measure_Unit.name>MWH</price_Measure_Unit.name>
    <curveType>A01</curveType>
    <Period>
      <timeInterval><start>2026-09-10T22:00Z</start><end>2026-09-10T23:00Z</end></timeInterval>
      <resolution>PT15M</resolution>
      <Point><position>1</position><price.amount>82</price.amount></Point>
      <Point><position>2</position><price.amount>81</price.amount></Point>
      <Point><position>3</position><price.amount>80</price.amount></Point>
      <Point><position>4</position><price.amount>79</price.amount></Point>
    </Period>
  </TimeSeries>
</Publication_MarketDocument>`;

const GENERATION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GL_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0">
  <TimeSeries>
    <inBiddingZone_Domain.mRID codingScheme="A01">10YFR-RTE------C</inBiddingZone_Domain.mRID>
    <quantity_Measure_Unit.name>MAW</quantity_Measure_Unit.name>
    <MktPSRType><psrType>B14</psrType></MktPSRType>
    <Period>
      <timeInterval><start>2026-09-10T22:00Z</start><end>2026-09-10T23:00Z</end></timeInterval>
      <resolution>PT60M</resolution>
      <Point><position>1</position><quantity>40000</quantity></Point>
    </Period>
  </TimeSeries>
  <TimeSeries>
    <outBiddingZone_Domain.mRID codingScheme="A01">10YFR-RTE------C</outBiddingZone_Domain.mRID>
    <quantity_Measure_Unit.name>MAW</quantity_Measure_Unit.name>
    <MktPSRType><psrType>B10</psrType></MktPSRType>
    <Period>
      <timeInterval><start>2026-09-10T22:00Z</start><end>2026-09-10T23:00Z</end></timeInterval>
      <resolution>PT60M</resolution>
      <Point><position>1</position><quantity>1200</quantity></Point>
    </Period>
  </TimeSeries>
</GL_MarketDocument>`;

const NO_DATA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Acknowledgement_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-1:acknowledgementdocument:8:1">
  <Reason><code>999</code><text>No matching data found for Data item Day-ahead Prices [12.1.D]</text></Reason>
</Acknowledgement_MarketDocument>`;

const REJECTED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Acknowledgement_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-1:acknowledgementdocument:8:1">
  <Reason><code>999</code><text>Unauthorized. Missing or invalid security token</text></Reason>
</Acknowledgement_MarketDocument>`;

describe("parseEntsoeDocument", () => {
  test("expands A03 curves by filling skipped positions forward", () => {
    const series = parseEntsoeDocument(PRICES_XML);
    const hourly = series.find((entry) => entry.resolution === "PT60M")!;
    expect(hourly.currency).toBe("EUR");
    expect(hourly.points.map((point) => point.value)).toEqual([80.5, 75, 75, -2.25]);
    expect(hourly.points[0]!.ts).toBe(Date.parse("2026-09-10T22:00Z"));
    expect(hourly.points[3]!.ts - hourly.points[2]!.ts).toBe(60 * 60_000);
  });

  test("keeps mixed resolutions apart and prefers hourly when merging", () => {
    const series = parseEntsoeDocument(PRICES_XML);
    expect(series.map((entry) => entry.resolution).sort()).toEqual(["PT15M", "PT60M"]);
    expect(mergeSeries(series, "PT60M")!.resolution).toBe("PT60M");
    const quarter = mergeSeries(series, "PT15M")!;
    expect(quarter.resolution).toBe("PT15M");
    expect(quarter.points).toHaveLength(4);
  });

  test("reads generation documents including the consumption leg marker", () => {
    const series = parseEntsoeDocument(GENERATION_XML);
    expect(series).toHaveLength(2);
    expect(series[0]!.psrType).toBe("B14");
    expect(series[0]!.inBiddingZone).toBe("10YFR-RTE------C");
    expect(series[1]!.outBiddingZone).toBe("10YFR-RTE------C");
    expect(series[1]!.inBiddingZone).toBeNull();
    expect(series[0]!.points[0]!.value).toBe(40000);
  });

  test("treats 'no matching data' as empty and other acknowledgements as errors", () => {
    expect(parseEntsoeDocument(NO_DATA_XML)).toEqual([]);
    expect(() => parseEntsoeDocument(REJECTED_XML)).toThrow(EntsoeApiError);
  });
});

describe("local trading days", () => {
  test("resolves CET midnight across a DST boundary", () => {
    expect(localMidnightUtc("2026-07-01", "Europe/Berlin")).toBe(Date.parse("2026-06-30T22:00Z"));
    expect(localMidnightUtc("2026-12-01", "Europe/Berlin")).toBe(Date.parse("2026-11-30T23:00Z"));
  });

  test("shifts whole local days and returns a 23h window on the spring-forward day", () => {
    const now = Date.parse("2026-03-28T12:00Z");
    const tomorrow = localDayWindow(now, "Europe/Berlin", 1);
    expect(tomorrow.dateKey).toBe("2026-03-29");
    expect(tomorrow.endMs - tomorrow.startMs).toBe(23 * 60 * 60_000);
  });
});

describe("priceStats", () => {
  test("splits peak (08-20 local) from off-peak and finds extremes", () => {
    const start = localMidnightUtc("2026-09-11", "Europe/Berlin");
    const points = Array.from({ length: 24 }, (_, hour) => ({
      ts: start + hour * 60 * 60_000,
      value: hour >= 8 && hour < 20 ? 100 : 50,
    }));
    const stats = priceStats(points, "Europe/Berlin");
    expect(stats.baseload).toBe(75);
    expect(stats.peak).toBe(100);
    expect(stats.offPeak).toBe(50);
    expect(stats.count).toBe(24);
    expect(stats.min!.value).toBe(50);
    expect(stats.max!.value).toBe(100);
  });
});
