import { InjectedConnector } from "@starknet-react/core";
import { LAST_CONNECTED_TIME_LOCALSTORAGE_KEY } from "~~/utils/Constants";
import { getTargetNetworks } from "~~/utils/scaffold-stark";

export const connectors = getConnectors();

function withDisconnectWrapper(connector: InjectedConnector) {
  const connectorDisconnect = connector.disconnect;
  const _disconnect = (): Promise<void> => {
    localStorage.removeItem("lastUsedConnector");
    localStorage.removeItem(LAST_CONNECTED_TIME_LOCALSTORAGE_KEY);
    return connectorDisconnect();
  };
  connector.disconnect = _disconnect.bind(connector);
  return connector;
}

function getConnectors() {
  const xverse = new InjectedConnector({ options: { id: "xverse" } });
  const braavos = new InjectedConnector({ options: { id: "braavos" } });
  return [withDisconnectWrapper(xverse), withDisconnectWrapper(braavos)];
}

export const appChains = getTargetNetworks();
