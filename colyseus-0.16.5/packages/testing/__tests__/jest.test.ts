
declare var describe: any, it: any, expect: any, beforeAll: any, afterAll: any, beforeEach: any;

import { ColyseusTestServer, boot } from "../src";
import appConfig from "../test/app1/arena.config";

describe('@colyseus/testing - jest compatibility', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => colyseus = await boot(appConfig));
  afterAll(async () => await colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it('returns result from subtract', async () => {
    const client = await colyseus.sdk.joinOrCreate("room_without_state");

    const room = colyseus.getRoomById(client.roomId);
    expect(client.roomId).toEqual(room.roomId);

    // expect(result).toEqual(0);
    // expect(mockSub).toBeCalledWith(2, 2);
  });

  it('one', async () => {
    const client1 = await colyseus.sdk.joinOrCreate("room_without_state");
    const client2 = await colyseus.sdk.joinOrCreate("room_without_state");
    expect(client1.roomId).toEqual(client2.roomId);
  });

  it('two', async () => {
    const client1 = await colyseus.sdk.joinOrCreate("room_without_state");
    const client2 = await colyseus.sdk.joinOrCreate("room_without_state");
    expect(client1.roomId).toEqual(client2.roomId);
  });

  it('three', async () => {
    const client1 = await colyseus.sdk.joinOrCreate("room_without_state");
    const client2 = await colyseus.sdk.joinOrCreate("room_without_state");
    expect(client1.roomId).toEqual(client2.roomId);
  });

  it('four', async () => {
    const client1 = await colyseus.sdk.joinOrCreate("room_without_state");
    const client2 = await colyseus.sdk.joinOrCreate("room_without_state");
    expect(client1.roomId).toEqual(client2.roomId);
  });

  it('five', async () => {
    const client1 = await colyseus.sdk.joinOrCreate("room_without_state");
    const client2 = await colyseus.sdk.joinOrCreate("room_without_state");
    expect(client1.roomId).toEqual(client2.roomId);
  });

});
