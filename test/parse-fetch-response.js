import expect from 'expect.js'
import parse from './parse'

describe('parse', function() {
  describe('fetch-response', () => {
    it('parses empty response', async () => {
      const buff = Buffer([
        0x00, 0x00, 0x00, 0x08, //length (32)
        0x00, 0x00, 0x00, 0x03, //correlationId (0)
        0x00, 0x00, 0x00, 0x00, //length of topic array (1)
      ])
      const messages = await parse(buff)
      expect(messages).to.have.length(1)
      const [msg] = messages
      expect(msg.correlationId).to.be(3)

      const res = msg.readFetchResponse()
      expect(res.topics).to.have.length(0)
    })

    it('parses topics with empty partitions', async () => {
      const buff = Buffer([
        0x00, 0x00, 0x00, 0x17, //length (32)
        0x00, 0x00, 0x00, 0x07, //correlationId (7)
        0x00, 0x00, 0x00, 0x02, //length of topic array (2)

        //first topic name length (1)
        0x00, 0x01,
        0x21, //topic name (!)
        0x00, 0x00, 0x00, 0x00, //length of partition array

        //second topic name length (1)
        0x00, 0x02,
        0x21, 0x21, //topic name (!!)
        0x00, 0x00, 0x00, 0x00, //length of partition array
      ])
      const messages = await parse(buff)
      expect(messages).to.have.length(1)
      const [msg] = messages
      expect(msg.correlationId).to.be(7)

      const res = msg.readFetchResponse()
      expect(res.topics).to.have.length(2)
    })

    it('parses topics with partitions', async () => {
      const buff = Buffer([
        0x00, 0x00, 0x00, 51, //length (53)
        0x00, 0x00, 0x00, 0x09, //correlationId (7)
        0x00, 0x00, 0x00, 0x01, //length of topic array (1)

        //first topic name length (1)
        0x00, 0x01,
        0x21, //topic name (!)
        0x00, 0x00, 0x00, 0x02, //length of partition array

          //partition 0
          0x00, 0x00, 0x00, 0x00, //partition id (0)
          0x00, 0x01, //errorCode (1)
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, //highwatermark offset (1) - string
          0x00, 0x00, 0x00, 0x00, //messageset size (0 bytes)

          //partition 1
          0x00, 0x00, 0x00, 0x01, //partition id (1)
          0x00, 0x00, //errorCode (0)
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, //highwatermark offset (9) - string
          0x00, 0x00, 0x00, 0x00, //messageset size (0 bytes)
      ])
      const messages = await parse(buff)
      expect(messages).to.have.length(1)
      const [msg] = messages
      expect(msg.correlationId).to.be(9)

      const res = msg.readFetchResponse()
      expect(res.topics).to.have.length(1)

      const [topic] = res.topics
      expect(topic.partitions).to.have.length(2)

      const [part1, part2] = topic.partitions
      expect(part1).to.eql({
        id: 0,
        errorCode: 1,
        highwaterMarkOffset: '2',
        messageSet: {
          size: 0,
          messages: []
        }
      })

      expect(part2).to.eql({
        id: 1,
        errorCode: 0,
        highwaterMarkOffset: '9',
        messageSet: {
          size: 0,
          messages: []
        }
      })
    })

    it('parses message-set', async () => {
      const buff = Buffer([
        0x00, 0x00, 0x00, 53, //length (53)
        0x00, 0x00, 0x00, 0x09, //correlationId (7)
        0x00, 0x00, 0x00, 0x01, //length of topic array (1)

        //first topic name length (1)
        0x00, 0x01,
        0x21, //topic name (!)
        0x00, 0x00, 0x00, 0x01, //length of partition array

          //partition 0
          0x00, 0x00, 0x00, 0x00, //partition id (0)
          0x00, 0x01, //errorCode (1)
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, //highwatermark offset (1) - string
          0x00, 0x00, 0x00, 20, //messageset size (20 bytes)

          //message set
          //message 0
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, //offset (1)
          0x00, 0x00, 0x00, 0x10, //message size (16)
          0x00, 0x00, 0x00, 0x00, //crc32 (0)
          0x00, //magic byte
          0x00, //attributes,
          0xFF, 0xFF, 0xFF, 0xFF, //-1 key length - null key
          0x00, 0x00, 0x00, 0x06, //message value length (6)
          0x21, 0x21, 0x22, 0x22, 0x23, 0x23 //message body

      ])
      const messages = await parse(buff)
      expect(messages).to.have.length(1)
      const [msg] = messages
      expect(msg.correlationId).to.be(9)

      const res = msg.readFetchResponse()
      expect(res.topics).to.have.length(1)

      const [topic] = res.topics
      expect(topic.partitions).to.have.length(1)

      const [part1] = topic.partitions
      expect(part1).to.eql({
        id: 0,
        errorCode: 1,
        highwaterMarkOffset: '2',
        messageSet: {
          size: 20,
          messages: ['todo - implement me']
        }
      })
    })
  })
})