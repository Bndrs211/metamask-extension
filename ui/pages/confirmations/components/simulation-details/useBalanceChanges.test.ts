import { Hex } from '@metamask/utils';
import { renderHook } from '@testing-library/react-hooks';
import {
  SimulationData,
  SimulationTokenStandard,
} from '@metamask/transaction-controller';
import { TokenStandard } from '../../../../../shared/constants/transaction';
import { getConversionRate } from '../../../../ducks/metamask/metamask';
import { getTokenStandardAndDetails } from '../../../../store/actions';
import { Numeric } from '../../../../../shared/modules/Numeric';
import { fetchTokenExchangeRates } from '../../../../helpers/utils/util';
import { useBalanceChanges } from './useBalanceChanges';
import { FIAT_UNAVAILABLE } from './types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../../ducks/metamask/metamask', () => ({
  getConversionRate: jest.fn(),
}));

jest.mock('../../../../selectors', () => ({
  getCurrentChainId: jest.fn(),
  getCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../helpers/utils/util', () => ({
  fetchTokenExchangeRates: jest.fn(),
}));

jest.mock('../../../../store/actions', () => ({
  getTokenStandardAndDetails: jest.fn(),
}));

const mockGetConversionRate = getConversionRate as jest.Mock;
const mockGetTokenStandardAndDetails = getTokenStandardAndDetails as jest.Mock;
const mockFetchTokenExchangeRates = fetchTokenExchangeRates as jest.Mock;

const ETH_TO_FIAT_RATE = 3;

const ERC20_TOKEN_ADDRESS_1_MOCK: Hex = '0x0erc20_1';
const ERC20_TOKEN_ADDRESS_2_MOCK: Hex = '0x0erc20_2';
const ERC20_DECIMALS_1_MOCK = 3;
const ERC20_DECIMALS_2_MOCK = 4;
const ERC20_TO_FIAT_RATE_1_MOCK = 1.5;
const ERC20_TO_FIAT_RATE_2_MOCK = 6;

const NFT_TOKEN_ADDRESS_MOCK: Hex = '0x0nft';

const TOKEN_ID_1_MOCK: Hex = '0x123';

const DIFFERENCE_1_MOCK: Hex = '0x11';
const DIFFERENCE_2_MOCK: Hex = '0x2';
const DIFFERENCE_ETH_MOCK: Hex = '0x1234567890123456789';

const dummyBalanceChange = {
  previousBalance: '0xIGNORE' as Hex,
  newBalance: '0xIGNORE' as Hex,
};

const PENDING_PROMISE = () =>
  new Promise(() => {
    /* unresolved promise */
  });

describe('useBalanceChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokenStandardAndDetails.mockImplementation((address: Hex) => {
      const decimalMap: Record<Hex, number> = {
        [ERC20_TOKEN_ADDRESS_1_MOCK]: ERC20_DECIMALS_1_MOCK,
        [ERC20_TOKEN_ADDRESS_2_MOCK]: ERC20_DECIMALS_2_MOCK,
      };
      if (decimalMap[address]) {
        return Promise.resolve({
          decimals: decimalMap[address]?.toString() ?? undefined,
        });
      }
      return Promise.reject(new Error('Unable to determine token standard'));
    });
    mockGetConversionRate.mockReturnValue(ETH_TO_FIAT_RATE);
    mockFetchTokenExchangeRates.mockResolvedValue({
      [ERC20_TOKEN_ADDRESS_1_MOCK]: ERC20_TO_FIAT_RATE_1_MOCK,
      [ERC20_TOKEN_ADDRESS_2_MOCK]: ERC20_TO_FIAT_RATE_2_MOCK,
    });
  });

  describe('pending states', () => {
    it('returns pending=true if no simulation data', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useBalanceChanges(undefined),
      );
      expect(result.current).toEqual({ pending: true, value: [] });
      await waitForNextUpdate();
    });

    it('returns pending=true while fetching token decimals', async () => {
      mockGetTokenStandardAndDetails.mockImplementation(PENDING_PROMISE);
      const simulationData: SimulationData = {
        nativeBalanceChange: undefined,
        tokenBalanceChanges: [
          {
            ...dummyBalanceChange,
            difference: DIFFERENCE_1_MOCK,
            isDecrease: true,
            address: ERC20_TOKEN_ADDRESS_1_MOCK,
            standard: SimulationTokenStandard.erc20,
          },
        ],
      };
      const { result, unmount, waitForNextUpdate } = renderHook(() =>
        useBalanceChanges(simulationData),
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({ pending: true, value: [] });
      unmount();
    });

    it('returns pending=true while fetching token fiat rates', async () => {
      mockFetchTokenExchangeRates.mockImplementation(PENDING_PROMISE);
      const simulationData: SimulationData = {
        nativeBalanceChange: undefined,
        tokenBalanceChanges: [
          {
            ...dummyBalanceChange,
            difference: DIFFERENCE_1_MOCK,
            isDecrease: true,
            address: ERC20_TOKEN_ADDRESS_1_MOCK,
            standard: SimulationTokenStandard.erc20,
          },
        ],
      };
      const { result, unmount, waitForNextUpdate } = renderHook(() =>
        useBalanceChanges(simulationData),
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({ pending: true, value: [] });
      unmount();
    });
  });

  describe('with token balance changes', () => {
    const setupHook = (
      tokenBalanceChanges: SimulationData['tokenBalanceChanges'],
    ) => {
      const simulationData: SimulationData = {
        nativeBalanceChange: undefined,
        tokenBalanceChanges,
      };
      return renderHook(() => useBalanceChanges(simulationData));
    };

    it('maps token balance changes correctly', async () => {
      const { result, waitForNextUpdate } = setupHook([
        {
          ...dummyBalanceChange,
          difference: DIFFERENCE_1_MOCK,
          isDecrease: true,
          address: ERC20_TOKEN_ADDRESS_1_MOCK,
          standard: SimulationTokenStandard.erc20,
        },
      ]);

      await waitForNextUpdate();

      const changes = result.current.value;
      expect(changes).toEqual([
        {
          asset: {
            address: ERC20_TOKEN_ADDRESS_1_MOCK,
            standard: TokenStandard.ERC20,
            tokenId: undefined,
          },
          amount: {
            isNegative: true,
            quantity: DIFFERENCE_1_MOCK,
            decimals: 3,
            numeric: expect.any(Numeric),
          },
          fiatAmount: Number('-0.0255'),
        },
      ]);
      expect(changes[0].amount.numeric.toString()).toBe('-0.017');
    });

    it('handles multiple token balance changes', async () => {
      const { result, waitForNextUpdate } = setupHook([
        {
          ...dummyBalanceChange,
          difference: DIFFERENCE_1_MOCK,
          isDecrease: true,
          address: ERC20_TOKEN_ADDRESS_1_MOCK,
          standard: SimulationTokenStandard.erc20,
        },
        {
          ...dummyBalanceChange,
          difference: DIFFERENCE_2_MOCK,
          isDecrease: false,
          address: ERC20_TOKEN_ADDRESS_2_MOCK,
          standard: SimulationTokenStandard.erc20,
        },
      ]);

      await waitForNextUpdate();

      const changes = result.current.value;
      expect(changes).toHaveLength(2);
      expect(changes[0].amount.numeric.toString()).toBe('-0.017');
      expect(changes[0].fiatAmount).toBe(Number('-0.0255'));
      expect(changes[1].amount.numeric.toString()).toBe('0.0002');
      expect(changes[1].fiatAmount).toBe(Number('0.0012'));
    });

    it('handles non-ERC20 tokens', async () => {
      const { result, waitForNextUpdate } = setupHook([
        {
          ...dummyBalanceChange,
          difference: DIFFERENCE_1_MOCK,
          isDecrease: true,
          address: NFT_TOKEN_ADDRESS_MOCK,
          standard: SimulationTokenStandard.erc721,
          id: TOKEN_ID_1_MOCK,
        },
      ]);

      await waitForNextUpdate();

      expect(result.current.value).toEqual([
        {
          asset: {
            address: NFT_TOKEN_ADDRESS_MOCK,
            standard: TokenStandard.ERC721,
            tokenId: TOKEN_ID_1_MOCK,
          },
          amount: {
            isNegative: true,
            quantity: DIFFERENCE_1_MOCK,
            decimals: 0,
            numeric: expect.any(Numeric),
          },
          fiatAmount: FIAT_UNAVAILABLE,
        },
      ]);
    });

    it('uses default decimals when token details not found', async () => {
      const { result, waitForNextUpdate } = setupHook([
        {
          ...dummyBalanceChange,
          difference: DIFFERENCE_1_MOCK,
          isDecrease: true,
          address: '0x0unknown',
          standard: SimulationTokenStandard.erc20,
        },
      ]);

      await waitForNextUpdate();

      expect(result.current.value[0].amount.decimals).toBe(18);
    });
  });

  describe('with native balance change', () => {
    const setupHook = (
      nativeBalanceChange?: SimulationData['nativeBalanceChange'],
    ) => {
      const simulationData: SimulationData = {
        nativeBalanceChange,
        tokenBalanceChanges: [],
      };
      return renderHook(() => useBalanceChanges(simulationData));
    };

    it('maps native balance change correctly', async () => {
      const { result, waitForNextUpdate } = setupHook({
        ...dummyBalanceChange,
        difference: DIFFERENCE_ETH_MOCK,
        isDecrease: true,
      });

      await waitForNextUpdate();

      const changes = result.current.value;
      expect(changes).toEqual([
        {
          asset: {
            standard: TokenStandard.none,
          },
          amount: {
            isNegative: true,
            quantity: DIFFERENCE_ETH_MOCK,
            decimals: 18,
            numeric: expect.any(Numeric),
          },
          fiatAmount: Number('-16119.010925996032'),
        },
      ]);
      expect(changes[0].amount.numeric.toString()).toBe(
        '-5373.003641998677469065',
      );
    });

    it('handles no native balance change', async () => {
      const { result, waitForNextUpdate } = setupHook(undefined);
      await waitForNextUpdate();
      expect(result.current.value).toEqual([]);
    });
  });

  it('combines native and token balance changes', async () => {
    const simulationData: SimulationData = {
      nativeBalanceChange: {
        ...dummyBalanceChange,
        difference: DIFFERENCE_ETH_MOCK,
        isDecrease: true,
      },
      tokenBalanceChanges: [
        {
          ...dummyBalanceChange,
          difference: DIFFERENCE_2_MOCK,
          isDecrease: false,
          address: ERC20_TOKEN_ADDRESS_1_MOCK,
          standard: SimulationTokenStandard.erc20,
        },
      ],
    };
    const { result, waitForNextUpdate } = renderHook(() =>
      useBalanceChanges(simulationData),
    );

    await waitForNextUpdate();

    const changes = result.current.value;
    expect(changes).toHaveLength(2);
    expect(changes[0].asset).toEqual({
      standard: TokenStandard.none,
    });
    expect(changes[0].amount.numeric.toString()).toBe(
      '-5373.003641998677469065',
    );
    expect(changes[0].fiatAmount).toBe(Number('-16119.010925996032'));
    expect(changes[1].asset).toEqual({
      address: ERC20_TOKEN_ADDRESS_1_MOCK,
      standard: TokenStandard.ERC20,
    });
    expect(changes[1].amount.numeric.toString()).toBe('0.002');
  });
});
