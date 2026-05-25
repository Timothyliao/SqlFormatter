import { describe, it, expect } from 'vitest';
import { CSharpStrategy } from '../src/formatter/stacktrace/CSharpStrategy';

describe('CSharpStrategy — single-space compressed Chinese stacktrace', () => {
  const input = `System.InvalidOperationException: 序列不包含任何元素 在 System.Linq.Enumerable.Max(IEnumerabl1 source) 在 S3.FMS.PfSearch.PfOrderProfit.PfOrderProfitNew.<>c__DisplayClass7_0.<GetSkuEstimateFeeV3GP>g__calcCore|0(RowMol rowMol) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\PfSearch\\PfOrderProfit\\PfOrderProfitNew_GP.cs:行号 826 在 S3.FMS.PfSearch.PfOrderProfit.PfOrderProfitNew.GetSkuEstimateFeeV3GP(PfOrderProfitNewModel profitModel, Dictionary2 customizeTypeSkuEstimates, ConnectionAdapter adsCA, Dictionar2 inputCustomizeTypeSkuCountList) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\PfSearch\\PfOrderProfit\\PfOrderProfitNew_GP.cs:行号 704 在 S3.FMS.GP.PfSkuProfitEnhance.BusinessService.PfSkuProfitGpOrderService.ResultMapper(Dictionary2 rows, PfOrderProfitNewModel profitModel) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\GP\\PfSkuProfitEnhance\\BusinessService\\PfSkuProfitGpOrderService.cs:行号 803 在 S3.FMS.GP.PfSkuProfitEnhance.LiveReport.SkuProfit.Services.PfLiveSkuProfitService.ResultMapper(Dictionar2 rows, PfOrderProfitNewModel profitModel) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\GP\\PfSkuProfitEnhance\\LiveReport\\SkuProfit\\Services\\PfLiveSkuProfitService.cs:行号 371 在 S3.FMS.GP.PfSkuProfitEnhance.BusinessService.PfSkuProfitGpOrderService.GetPfSkuProfit(PfOrderProfitNewSearchModel searchModel) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\GP\\PfSkuProfitEnhance\\BusinessService\\PfSkuProfitGpOrderService.cs:行号 221 在 S3.FMS.WebApi.Service.PF.OrderSku.OrderSkuAPIService.SkuProfit(ConnectionAdapter ca, PfOrderProfitNewSearchModel searchModel, ShowRowDataRes showRes, OrderSkuRequest1 request, GetOrderSkuResponse& innerSkuRsp) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\WebApi\\Service\\PF\\OrderSku\\OrderSkuAPIService_Sku.cs:行号 176 在 S3.FMS.WebApi.Service.PF.OrderSku.OrderSkuAPIService.GetPFSkuList(Paging paging, OrderSkuRequest1 request) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\WebApi\\Service\\PF\\OrderSku\\OrderSkuAPIService_Sku.cs:行号 395`;

  it('should detect as C# stacktrace', () => {
    const strategy = new CSharpStrategy();
    expect(strategy.detect(input)).toBe(true);
  });

  it('should parse into multiple frames (full stacktrace)', () => {
    const strategy = new CSharpStrategy();
    const frames = strategy.parse(input);
    console.log('Frame count:', frames.length);
    for (const f of frames) {
      console.log(`  [${f.type}] method=${f.method || ''} file=${f.filePath || ''} line=${f.lineNumber || ''}`);
    }
    // 1 exception + 8 frames
    expect(frames.length).toBe(9);
    expect(frames[0]?.type).toBe('exception');
    expect(frames[0]?.exceptionType).toBe('System.InvalidOperationException');

    // All remaining should be frames
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]?.type).toBe('frame');
    }

    // Verify the closure/local function frame parsed correctly
    expect(frames[2]?.method).toContain('calcCore');
    expect(frames[2]?.lineNumber).toBe('826');
  });

  it('should still work with newline-separated input', () => {
    const multiline = `System.InvalidOperationException: 序列不包含任何元素
在 System.Linq.Enumerable.Max(IEnumerabl1 source)
在 S3.FMS.PfSearch.PfOrderProfit.PfOrderProfitNew.<>c__DisplayClass7_0.<GetSkuEstimateFeeV3GP>g__calcCore|0(RowMol rowMol) 位置 n:\\jenkins\\workspace\\CommonBuild\\W_PF\\S3.FMS\\PfSearch\\PfOrderProfit\\PfOrderProfitNew_GP.cs:行号 826`;
    const strategy = new CSharpStrategy();
    const frames = strategy.parse(multiline);
    expect(frames.length).toBe(3);
    expect(frames[0]?.type).toBe('exception');
    expect(frames[1]?.type).toBe('frame');
    expect(frames[2]?.type).toBe('frame');
    expect(frames[2]?.lineNumber).toBe('826');
  });
});
