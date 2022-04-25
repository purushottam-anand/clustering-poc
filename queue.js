export default class Queue
{
    // Array is used to implement a Queue
    constructor()
    {
        this.items = [];
    }

    // Functions to be implemented
    // enqueue(item)
    // dequeue()
    // front()
    // isEmpty()
    // printQueue()
    enqueue(element)
    {
        // adding element to the queue
        this.items.push(element);
    }
    dequeue()
    {
        // removing element from the queue
        // returns underflow when called
        // on empty queue
        if(this.isEmpty())
            return "Underflow";
        return this.items.shift();
    }
    dequeue()
    {
        // removing element from the queue
        // returns underflow when called
        // on empty queue
        if(this.isEmpty())
            return "Underflow";
        return this.items.shift();
    }

    isEmpty()
    {
        // return true if the queue is empty.
        return this.items.length == 0;
    }

    printQueue()
    {
        let str = "";
        for(let i = 0; i < this.items.length; i++)
            str += this.items[i] +" ";
        return str;
    }
}

